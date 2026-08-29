import { spawn } from "node:child_process";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9340;
const BASE = "http://localhost:3000";
const IMG = join(process.env.TEMP || ".", "dermai_test_img2.png");

const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + join(process.env.TEMP || ".", "dermai_cdp_profile3"),
  "about:blank",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(url) { return fetch(url).then((r) => r.json()); }
async function getWs() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await getJson(`http://127.0.0.1:${PORT}/json/list`);
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("CDP not ready");
}
let msgId = 0;
let pending = new Map();
function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => resolve(ws);
    ws.onerror = (e) => reject(e);
  });
}
async function cdp(ws, method, params = {}) {
  const id = ++msgId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
function onMessage(data) {
  const msg = JSON.parse(data.toString());
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  }
}
async function evalJs(ws, expression) {
  const r = await cdp(ws, "Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + " :: " + JSON.stringify(r.exceptionDetails.exception));
  return r.result.value;
}
async function load(ws, url) {
  await cdp(ws, "Page.navigate", { url });
  for (let i = 0; i < 50; i++) {
    await sleep(300);
    const info = await evalJs(ws, `document.readyState + "|" + (document.body ? document.body.innerText.length : 0)`).catch(() => "");
    if (String(info).startsWith("complete|") && Number(info.split("|")[1]) > 0) return;
  }
  throw new Error("load timeout: " + url);
}
async function clickByText(ws, text, tag = "button") {
  const r = await evalJs(ws, `(()=>{const els=[...document.querySelectorAll(${JSON.stringify(tag)})]; const el=els.find(e=>e.textContent && e.textContent.includes(${JSON.stringify(text)})); if(!el) return "NOTFOUND:"+${JSON.stringify(text)}+" count="+els.length; el.click(); return "OK:"+${JSON.stringify(text)};})()`);
  return r;
}
async function clickSelector(ws, selector) {
  const r = await evalJs(ws, `(()=>{const el=document.querySelector(${JSON.stringify(selector)}); if(!el) return "NOTFOUND:"+${JSON.stringify(selector)}; el.click(); return "OK:"+${JSON.stringify(selector)};})()`);
  return r;
}
async function grab(ws, label) {
  const t = await evalJs(ws, `document.body ? document.body.innerText : ""`);
  console.log("--- " + label + " ---");
  console.log(t.slice(0, 900).replace(/\n+/g, " | "));
}
async function waitFor(ws, expr, ms = 15000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    await sleep(250);
    try {
      const v = await evalJs(ws, expr);
      if (v) return v;
    } catch {}
  }
  return null;
}

const ws = await connect(await getWs());
ws.onmessage = (e) => onMessage(e.data);
await cdp(ws, "Page.enable");
await cdp(ws, "Runtime.enable");

await load(ws, BASE + "/login");
await sleep(400);
await evalJs(ws, `fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"demo@dermai.app",password:"Demo@1234"})}).then(r=>r.status)`);

await load(ws, BASE + "/screening");
await waitFor(ws, `!!document.querySelector('.feature-card')`, 15000);
await grab(ws, "step1");
console.log("clickArea:", await clickSelector(ws, ".feature-card"));
await sleep(300);
console.log("clickContinue:", await clickByText(ws, "Continue", "button"));
await sleep(500);
await grab(ws, "step2");

// set file input for scalp
await waitFor(ws, `document.querySelectorAll('input[type=file]').length > 0`, 15000);
const doc = await cdp(ws, "DOM.getDocument");
const nodes = await cdp(ws, "DOM.querySelectorAll", { nodeId: doc.root.nodeId, selector: 'input[type=file]' });
if (nodes.nodeIds.length) {
  await cdp(ws, "DOM.setFileInputFiles", { nodeId: nodes.nodeIds[0], files: [IMG] });
  await sleep(600);
}
console.log("GOT IMAGE PREVIEW:", await evalJs(ws, `!!document.querySelector('.preview-img')`));
await grab(ws, "step2b");
console.log("clickAnalyze:", await clickByText(ws, "Analyze images", "button"));
await sleep(1500);
await grab(ws, "step3");
console.log("clickRun:", await clickByText(ws, "Run analysis", "button"));
for (let i = 0; i < 20; i++) { await sleep(300); const r = await evalJs(ws, `document.body.innerText.includes("Continue to questions")`); if (r) break; }
await grab(ws, "step3-done");
console.log("clickQ:", await clickByText(ws, "Continue to questions", "button"));
await sleep(600);
await grab(ws, "step4-start");

// answer questions one by one until completion or stall
let counter = 0;
for (let n = 1; n <= 60; n++) {
  counter = n;
  const handled = await evalJs(ws, `(()=>{ const nn=${JSON.stringify(counter)}; if(document.body.innerText.includes('Loading questions')) return 'LOADING'; const card=document.querySelector('.question-card'); if(!card) return 'DONE-OR-STALL:'+document.body.innerText.slice(0,140).replace(/\\n/g,'|'); const h=document.querySelector('.question-actions h3'); const header=h?h.innerText:''; const lab=card.querySelector('label input[type=radio]'); if(lab){ const all=[...card.querySelectorAll('label')]; const chosen=all[0]; chosen.click(); return 'Q'+nn+' '+header+' radio:'+(chosen?chosen.innerText:''); } const sel=card.querySelector('select'); if(sel){ const opts=[...sel.options]; if(opts.length>1){ sel.value=opts[1].value; sel.dispatchEvent(new Event('change',{bubbles:true})); return 'Q'+nn+' '+header+' select:'+sel.value; } } const slider=card.querySelector('input[type=range]'); if(slider){ slider.value=5; slider.dispatchEvent(new Event('input',{bubbles:true})); slider.dispatchEvent(new Event('change',{bubbles:true})); return 'Q'+nn+' '+header+' slider:5'; } const chk=card.querySelector('input[type=checkbox]'); if(chk){ chk.click(); return 'Q'+nn+' '+header+' checkbox'; } const txt=card.querySelector('input[type=text]'); if(txt){ const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; setter.call(txt,'some text'); txt.dispatchEvent(new Event('input',{bubbles:true})); return 'Q'+nn+' '+header+' text'; } return 'NOCTRL '+header;})()`);
  console.log("Q" + n + ":", handled);
  if (handled === 'LOADING') { console.log('STALLED AT LOADING'); break; }
  if (String(handled).startsWith('DONE-OR-STALL')) { console.log('STOP:', handled); break; }
  if (String(handled) === 'NOCTRL') { console.log('NO CONTROL FOUND'); break; }
  // wait for advance
  await sleep(600);
}
await grab(ws, "FINAL-STATE");