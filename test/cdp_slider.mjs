import { spawn } from "node:child_process";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9341;
const BASE = "http://localhost:3000";
const IMG = join(process.env.TEMP || ".", "dermai_test_img2.png");

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + join(process.env.TEMP || ".", "dermai_cdp_profile4"),
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
}
async function waitFor(ws, expr, ms = 15000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    await sleep(250);
    try { const v = await evalJs(ws, expr); if (v) return v; } catch {}
  }
  return null;
}
async function clickSel(ws, sel) {
  return evalJs(ws, `(()=>{const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return "NF"; el.click(); return "OK";})()`);
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
console.log("area:", await clickSel(ws, ".feature-card"));
await sleep(300);
console.log("continue:", await evalJs(ws, `(()=>{const el=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Continue')); if(!el) return 'NF'; el.click(); return 'OK';})()`));
const fiReady = await waitFor(ws, `document.querySelectorAll('input[type=file]').length>0`, 15000);
if (!fiReady) throw new Error("file input never appeared");
const doc = await cdp(ws, "DOM.getDocument");
const nodes = await cdp(ws, "DOM.querySelectorAll", { nodeId: doc.root.nodeId, selector: 'input[type=file]' });
await cdp(ws, "DOM.setFileInputFiles", { nodeId: nodes.nodeIds[0], files: [IMG] });
await sleep(500);
console.log("analyze:", await evalJs(ws, `(()=>{const el=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Analyze images')); if(!el) return 'NF'; el.click(); return 'OK';})()`));
await sleep(400);
console.log("run:", await evalJs(ws, `(()=>{const el=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Run analysis')); if(!el) return 'NF'; el.click(); return 'OK';})()`));
await waitFor(ws, `!!document.querySelector('.question-card')`, 20000);

// answer everything until completion or visible stall, using real events
async function advanceOne(i) {
  return evalJs(ws, `(()=>{const card=document.querySelector('.question-card'); if(!card) return 'NOCARD'; if(document.body.innerText.includes('Loading questions')) return 'LOADING'; const lab=card.querySelector('label input[type=radio]'); if(lab){ card.querySelectorAll('label')[0].click(); return 'radio'; } const sel=card.querySelector('select'); if(sel){ sel.value=sel.options[1].value; sel.dispatchEvent(new Event('change',{bubbles:true})); return 'select:'+sel.value; } const chk=card.querySelector('input[type=checkbox]'); if(chk){ chk.click(); return 'checkbox'; } const txt=card.querySelector('input[type=text]'); if(txt){ const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; setter.call(txt,'some text'); txt.dispatchEvent(new Event('input',{bubbles:true})); return 'text'; } const slider=card.querySelector('input[type=range]'); if(slider){ slider.focus(); return 'SLIDER'; } return 'NOCONTROL';})()`);
}
async function header() {
  return evalJs(ws, `document.querySelector('.question-actions h3') ? document.querySelector('.question-actions h3').innerText : 'NOHEADER'`);
}
for (let i = 0; i < 60; i++) {
  await sleep(500);
  const r = await advanceOne(i);
  console.log("step:", i, r, "->", await header());
  if (r === 'NOCARD') { console.log("NO CARD - likely finished or stall"); break; }
  if (r === 'LOADING') { console.log("STALLED LOADING"); break; }
  if (r === 'NOCONTROL') { console.log("NO CONTROL - stall"); break; }
  if (r === 'SLIDER') {
    await cdp(ws, "Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
    await cdp(ws, "Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
    await sleep(400);
  }
}
console.log("ALL HEADER:", await header());
const url = await evalJs(ws, `location.href`);
console.log("URL:", url);
const bodyText = await evalJs(ws, `document.body ? document.body.innerText.slice(0,600).replace(/\\n{2,}/g,' | ') : ''`);
console.log("BODY:", bodyText);
await chrome.kill();