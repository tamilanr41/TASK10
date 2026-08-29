import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9339;
const BASE = "http://localhost:3000";

const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + join(process.env.TEMP || ".", "dermai_cdp_profile"),
  "about:blank",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url);
  return res.json();
}

async function getWs() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await getJson(`http://127.0.0.1:${PORT}/json/list`);
      if (list.length) return list[0].webSocketDebuggerUrl;
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

const ws = await connect(await getWs());
ws.onmessage = (e) => onMessage(e.data);

await cdp(ws, "Page.enable");
await cdp(ws, "Runtime.enable");
await cdp(ws, "Page.navigate", { url: BASE + "/login" });

// wait until document is ready and content present
for (let i = 0; i < 40; i++) {
  await sleep(250);
  const ready = await evalJs(ws, `document.readyState + "|" + (document.body.innerText || "").slice(0,80)`).catch(() => "");
  if (String(ready).startsWith("complete|")) break;
}
const loginStatus = await evalJs(ws, `fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"demo@dermai.app",password:"Demo@1234"})}).then(r=>r.status).catch(e=>"FETCHERR:"+e.message)`);
console.log("LOGIN:", loginStatus);

// go to screening
await cdp(ws, "Page.navigate", { url: BASE + "/screening" });
for (let i = 0; i < 40; i++) {
  await sleep(250);
  const ready = await evalJs(ws, `document.readyState + "|" + (document.body.innerText || "").slice(0,80)`).catch(() => "");
  if (String(ready).startsWith("complete|")) break;
}

// step 1: pick scalp area
await evalJs(ws, `(()=>{const cards=[...document.querySelectorAll('.feature-card')]; const s=cards.find(c=>c.textContent.includes('Scalp / Hair') && !c.textContent.includes('+ Nails')); if(!s) return "no scalp card"; s.click(); return "clicked";})()`);
await sleep(400);
// continue button
await evalJs(ws, `(()=>{const btns=[...document.querySelectorAll('button')]; const b=btns.find(x=>x.textContent.includes('Continue')); if(!b) return "no continue"; b.click(); return "ok";})()`);
await sleep(800);

// step 2: need a real image -> skip? analyze requires image. Instead jump directly via UI: use a tiny canvas? 
// We can generate a fake image via canvas dataURL -> not a File. Instead skip step 2 by using drag? 
// Let's check current step text
const state = await evalJs(ws, `document.body.innerText.includes("Upload images") ? "step2" : document.body.innerText.slice(0,120)`);
console.log("STEP CHECK:", state);
await chrome.kill();