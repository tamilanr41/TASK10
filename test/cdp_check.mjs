import { spawn } from "node:child_process";
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
  "--user-data-dir=" + join(process.env.TEMP || ".", "dermai_cdp_profile2"),
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
  let last = "";
  for (let i = 0; i < 50; i++) {
    await sleep(300);
    const info = await evalJs(ws, `JSON.stringify({url:location.href, rs:document.readyState, len:(document.body?document.body.innerText.length:0), head:(document.body?document.body.innerText.slice(0,100):"")})`).catch(() => "");
    last = info;
    try {
      const j = JSON.parse(info);
      if (j.rs === "complete" && j.len > 0) return j;
    } catch {}
  }
  return { error: "timeout", last };
}

const ws = await connect(await getWs());
ws.onmessage = (e) => onMessage(e.data);
await cdp(ws, "Page.enable");
await cdp(ws, "Runtime.enable");
await cdp(ws, "Network.enable");
const events = [];
ws.onmessage = (e) => { onMessage(e.data); try { const m = JSON.parse(e.data.toString()); if (m.method) events.push(m.method); } catch {} };

const info = await load(ws, BASE + "/");
console.log("HOME:", JSON.stringify(info).slice(0, 400));

// Now try login
const info2 = await load(ws, BASE + "/login");
console.log("LOGIN PAGE:", JSON.stringify(info2).slice(0, 200));

// Try POST via fetch from within page
await sleep(500);
try {
  const st = await evalJs(ws, `fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"demo@dermai.app",password:"Demo@1234"})}).then(async r=>{const t=await r.text(); return r.status+"|"+t.slice(0,80)}).catch(e=>"FETCHERR:"+e.message)`);
  console.log("LOGIN POST:", st);
} catch (e) {
  console.log("eval err", e.message);
}
console.log("network events:", events.filter(e => e.startsWith("Network.")).slice(0, 12).join(","));
await chrome.kill();