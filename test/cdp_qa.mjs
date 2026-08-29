import { spawn } from "node:child_process";
import { join } from "node:path";
import { writeFileSync } from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9343;
const BASE = "http://localhost:3000";
const IMG = join(process.env.TEMP || ".", "dermai_test_img2.png");

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + join(process.env.TEMP || ".", "dermai_cdp_profile6"),
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
  if (r.exceptionDetails) return "EXC:" + (r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}
async function load(ws, url) {
  await cdp(ws, "Page.navigate", { url });
  for (let i = 0; i < 50; i++) {
    await sleep(300);
    const info = await evalJs(ws, `document.readyState + "|" + (document.body ? document.body.innerText.length : 0)`);
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
async function clickText(ws, text) {
  return evalJs(ws, `(()=>{const el=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(${JSON.stringify(text)})); if(!el) return 'NF'; el.click(); return 'OK';})()`);
}
async function screenshot(ws, name) {
  const shot = await cdp(ws, "Page.captureScreenshot", { format: "png" });
  writeFileSync(join(process.env.TEMP || ".", name + ".png"), Buffer.from(shot.data, "base64"));
  console.log("SCREENSHOT:", name + ".png");
}
async function pageState(ws) {
  return evalJs(ws, `(()=>{const h=document.querySelector('.question-actions h3'); const card=document.querySelector('.question-card'); return JSON.stringify({header:h?h.innerText:'', cardLabel: card? (card.querySelector('h4')||{}).innerText||'': '', loading: document.body.innerText.includes('Loading questions'), body: document.body.innerText.slice(0,300).replace(/\\n{2,}/g,' | ') });})()`);
}

const ws = await connect(await getWs());
ws.onmessage = (e) => onMessage(e.data);
await cdp(ws, "Page.enable");
await cdp(ws, "Runtime.enable");
await cdp(ws, "Console.enable");
const consoleMsgs = [];
ws.onmessage = (e) => {
  onMessage(e.data);
  try {
    const m = JSON.parse(e.data.toString());
    if (m.method === "Runtime.consoleAPICalled") consoleMsgs.push("[console] " + m.params.args.map(a => a.value || a.description || "").join(" "));
    if (m.method === "Runtime.exceptionThrown") consoleMsgs.push("[exc] " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    if (m.method === "Log.entryAdded") consoleMsgs.push("[log] " + (m.params.entry.text || ""));
  } catch {}
};

await load(ws, BASE + "/login");
await sleep(400);
await evalJs(ws, `fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"demo@dermai.app",password:"Demo@1234"})}).then(r=>r.status)`);

await load(ws, BASE + "/screening");
await waitFor(ws, `!!document.querySelector('.feature-card')`, 15000);
await evalJs(ws, `document.querySelector('.feature-card').click()`);
await sleep(200);
await clickText(ws, "Continue");
await waitFor(ws, `document.querySelectorAll('input[type=file]').length>0`, 15000);
const doc = await cdp(ws, "DOM.getDocument");
const nodes = await cdp(ws, "DOM.querySelectorAll", { nodeId: doc.root.nodeId, selector: 'input[type=file]' });
await cdp(ws, "DOM.setFileInputFiles", { nodeId: nodes.nodeIds[0], files: [IMG] });
await sleep(400);
await clickText(ws, "Analyze images");
await sleep(300);
await clickText(ws, "Run analysis");
await waitFor(ws, `!!document.querySelector('.question-card')`, 20000);
await screenshot(ws, "q1_initial");

let lastHeaderWorks = false;
for (let i = 1; i <= 7; i++) {
  const r = await evalJs(ws, `(()=>{const card=document.querySelector('.question-card'); if(!card) return 'NOCARD'; const lab=card.querySelector('label input[type=radio]'); if(lab){ card.querySelectorAll('label')[0].click(); return 'radio'; } const sel=card.querySelector('select'); if(sel){ sel.value=sel.options[1].value; sel.dispatchEvent(new Event('change',{bubbles:true})); return 'select:'+sel.value; } const slider=card.querySelector('input[type=range]'); if(slider){ slider.focus(); return 'SLIDER'; } const txt=card.querySelector('input[type=text]'); if(txt){ const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; setter.call(txt,'some text'); txt.dispatchEvent(new Event('input',{bubbles:true})); return 'text'; } return 'NOCTRL';})()`);
  const st = await pageState(ws);
  lastHeaderWorks = /\\d+ of \\d+ to answer/.test(st.header);
  console.log("answer" + i + ":", r, st);
  if (r === 'SLIDER') {
    await cdp(ws, "Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
    await cdp(ws, "Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
  }
  await sleep(1000);
  if (i === 6) { const h = await evalJs(ws, `document.querySelector('.question-actions h3') ? document.querySelector('.question-actions h3').innerText : ''`); console.log("FINAL HEADER:", h); const btn = await evalJs(ws, `[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Finish & get result'))`); console.log("HAS FINISH BTN:", btn); }
  if (i === 7) await screenshot(ws, "q7_submit_phase");
}
console.log("NEW COUNTER:", lastHeaderWorks);
console.log("CONSOLE ERRORS:", JSON.stringify(consoleMsgs, null, 0));
await chrome.kill();