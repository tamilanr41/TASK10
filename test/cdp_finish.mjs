import { spawn } from "node:child_process";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9344;
const BASE = "http://localhost:3000";
const IMG = join(process.env.TEMP || ".", "dermai_test_img2.png");

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + join(process.env.TEMP || ".", "dermai_cdp_profile7"),
  "about:blank",
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getWs() {
  for (let i = 0; i < 40; i++) {
    try {
      const l = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
      const p = l.find((t) => t.type === "page");
      if (p) return p.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("no cdp");
}
let id = 0;
const pend = new Map();
function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const w = new WebSocket(wsUrl);
    w.onopen = () => resolve(w);
    w.onerror = () => reject(new Error("ws connect failed"));
  });
}
const ws = await connect(await getWs());
ws.onmessage = (e) => {
  const m = JSON.parse(e.data.toString());
  if (m.id && pend.has(m.id)) {
    const { resolve, reject } = pend.get(m.id);
    pend.delete(m.id);
    m.error ? reject(new Error(m.error.message)) : resolve(m.result);
  }
};
async function cdp(method, params = {}) {
  const i = ++id;
  return new Promise((res, rej) => {
    pend.set(i, { resolve: res, reject: rej });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
}
async function ev(expr) {
  const r = await cdp("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  return r.exceptionDetails ? "EXC:" + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) : r.result.value;
}
async function load(url) {
  await cdp("Page.navigate", { url });
  for (let i = 0; i < 60; i++) {
    await sleep(300);
    const s = await ev(`document.readyState+"|"+(document.body?document.body.innerText.length:0)`);
    if (String(s).startsWith("complete|") && Number(s.split("|")[1]) > 0) return;
  }
}
async function waitFor(expr, ms = 20000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    await sleep(250);
    try { const v = await ev(expr); if (v) return v; } catch {}
  }
  return null;
}
async function clickBtn(text) {
  return ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes(${JSON.stringify(text)}));if(!b)return 'NF';b.click();return 'OK';})()`);
}
async function answer() {
  const r = await ev(`(()=>{const c=document.querySelector('.question-card');if(!c)return 'NOCARD';const lab=c.querySelector('label input[type=radio]');if(lab){c.querySelectorAll('label')[0].click();return 'radio';}const sel=c.querySelector('select');if(sel){sel.value=sel.options[1].value;sel.dispatchEvent(new Event('change',{bubbles:true}));return 'select';}const sl=c.querySelector('input[type=range]');if(sl){sl.focus();return 'SLIDER';}const tx=c.querySelector('input[type=text]');if(tx){Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(tx,'some text');tx.dispatchEvent(new Event('input',{bubbles:true}));return 'text';}return 'NOCTRL';})()`);
  if (r === 'SLIDER') {
    await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
    await cdp("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
    await sleep(900);
    await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
    await cdp("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
  }
  await sleep(800);
  return r;
}

await cdp("Page.enable");
await cdp("Runtime.enable");
await load(BASE + "/login");
await sleep(400);
await ev(`fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"demo@dermai.app",password:"Demo@1234"})}).then(r=>r.status)`);
await load(BASE + "/screening");
await waitFor(`!!document.querySelector('.feature-card')`);
await ev(`document.querySelector('.feature-card').click()`);
await sleep(200);
await clickBtn("Continue");
await waitFor(`document.querySelectorAll('input[type=file]').length>0`);
const doc = await cdp("DOM.getDocument");
const nodes = await cdp("DOM.querySelectorAll", { nodeId: doc.root.nodeId, selector: 'input[type=file]' });
await cdp("DOM.setFileInputFiles", { nodeId: nodes.nodeIds[0], files: [IMG] });
await sleep(400);
await clickBtn("Analyze images");
await sleep(300);
await clickBtn("Run analysis");
await waitFor(`!!document.querySelector('.question-card')`, 30000);
// New flow: answer (record) then click "Next question ->" (or "Finish & get result ->")
const clickNext = () => ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Next question')||x.textContent.includes('Finish & get result'));if(!b)return 'NF';if(b.disabled)return 'DISABLED';b.click();return 'OK';})()`);
let count = 0;
let lastH = "";
while (true) {
  const r = await answer(); // records answer into state; no auto-advance now
  lastH = await ev(`document.querySelector('.question-actions h3')?document.querySelector('.question-actions h3').innerText:''`);
  const nextText = await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Next question')||x.textContent.includes('Finish & get result'));return b?b.textContent.trim():'NF';})()`);
  const disabled = await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Next question')||x.textContent.includes('Finish & get result'));return b?b.disabled:'n/a';})()`);
  count++;
  console.log(`Q${count} r=${r} header="${lastH}" button="${nextText}" disabled=${disabled}`);
  if (/Finish & get result/.test(String(nextText))) { console.log("FINAL question reached; clicking finish next"); break; }
  if (r === 'NOCARD' || count > 60) { console.log("ABORT"); break; }
  const b = await clickNext();
  if (b !== 'OK') { console.log("NEXT FAIL:", b); break; }
  await waitFor(`!!document.querySelector('.question-card')`, 15000);
}
const btn2 = await clickNext(); // clicks "Finish & get result ->"
console.log("clicked Finish:", btn2);
let url = "";
for (let i = 0; i < 30; i++) {
  await sleep(500);
  url = await ev(`location.pathname`);
  if (url.startsWith("/screening/result")) break;
}
console.log("URL after submit:", url);
await chrome.kill();