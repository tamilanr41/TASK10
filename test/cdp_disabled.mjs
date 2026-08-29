import { spawn } from "node:child_process";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9345;
const BASE = "http://localhost:3000";
const IMG = join(process.env.TEMP || ".", "dermai_test_img2.png");

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--remote-debugging-port=" + PORT, "--user-data-dir=" + join(process.env.TEMP || ".", "dermai_cdp_profile8"), "about:blank"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getWs() {
  for (let i = 0; i < 40; i++) {
    try { const l = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json()); const p = l.find((t) => t.type === "page"); if (p) return p.webSocketDebuggerUrl; } catch {}
    await sleep(250);
  }
  throw Error("no cdp");
}
let id = 0;
const pend = new Map();
function connect(wsUrl) {
  return new Promise((res, rej) => { const w = new WebSocket(wsUrl); w.onopen = () => res(w); w.onerror = rej; });
}
const ws = await connect(await getWs());
ws.onmessage = (e) => {
  const m = JSON.parse(e.data.toString());
  if (m.id && pend.has(m.id)) {
    const { resolve, reject } = pend.get(m.id);
    pend.delete(m.id);
    m.error ? reject(Error(m.error.message)) : resolve(m.result);
  }
};
async function cdp(method, params = {}) {
  const i = ++id;
  return new Promise((res, rej) => { pend.set(i, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id: i, method, params })); });
}
async function ev(expr) {
  const r = await cdp("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  return r.exceptionDetails ? "EXC" : r.result.value;
}
async function load(url) {
  await cdp("Page.navigate", { url });
  for (let i = 0; i < 60; i++) { await sleep(300); if ((await ev(`document.readyState`)) === "complete") return; }
}
async function waitFor(expr, ms = 20000) {
  const t = Date.now();
  while (Date.now() - t < ms) { await sleep(250); try { if (await ev(expr)) return; } catch {} }
  return null;
}
async function btn(text) {
  return ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes(${JSON.stringify(text)}));return b?b.disabled:'NF';})()`);
}
await cdp("Page.enable");
await cdp("Runtime.enable");
await load(BASE + "/login");
await sleep(400);
await ev(`fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"demo@dermai.app",password:"Demo@1234"})}).then(r=>r.status)`);
await load(BASE + "/screening");
await waitFor(`!!document.querySelector('.feature-card')`);
await ev(`document.querySelector('.feature-card').click()`);
await sleep(150);
await ev(`[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Continue')).click()`);
await waitFor(`document.querySelectorAll('input[type=file]').length>0`);
const doc = await cdp("DOM.getDocument");
const nodes = await cdp("DOM.querySelectorAll", { nodeId: doc.root.nodeId, selector: 'input[type=file]' });
await cdp("DOM.setFileInputFiles", { nodeId: nodes.nodeIds[0], files: [IMG] });
await sleep(300);
await ev(`[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Analyze images')).click()`);
await sleep(200);
await ev(`[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Run analysis')).click()`);
await waitFor(`!!document.querySelector('.question-card')`, 30000);
console.log("Before answer, 'Next question' disabled =", await btn("Next question"));
await ev(`(()=>{const s=document.querySelector('.question-card select');s.value=s.options[1].value;s.dispatchEvent(new Event('change',{bubbles:true}));return 1;})()`);
await sleep(600);
console.log("After answer, 'Next question' disabled =", await btn("Next question"));
await chrome.kill();