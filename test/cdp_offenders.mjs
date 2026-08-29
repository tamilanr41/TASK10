import { spawn } from "node:child_process";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9346;
const BASE = "http://127.0.0.1:3100";

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + join(process.env.TEMP || ".", "dermai_cdp_offenders"),
  "about:blank",
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = async (url) => (await fetch(url)).json();
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
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
async function load(ws, url) {
  await cdp(ws, "Page.navigate", { url });
  for (let i = 0; i < 60; i++) {
    await sleep(300);
    const info = await evalJs(ws, `JSON.stringify({rs:document.readyState,len:(document.body?document.body.innerText.length:0)})`).catch(() => "{}");
    try { const j = JSON.parse(info); if (j.rs === "complete" && j.len > 0) return j; } catch {}
  }
  throw new Error("load timeout");
}

const ws = await connect(await getWs());
ws.onmessage = (e) => onMessage(e.data);
await cdp(ws, "Page.enable");
await cdp(ws, "Runtime.enable");

async function findOffenders(route) {
  await cdp(ws, "Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await load(ws, BASE + "/" + route);
  await sleep(600);
  const bad = await evalJs(ws, `JSON.stringify((()=>{
    const doc = document.documentElement;
    const docW = doc.clientWidth;
    const bodyW = document.body.getBoundingClientRect().width;
    const se = document.scrollingElement;
    const out = [];
    if (doc.scrollWidth > docW + 1) out.push({ at: "DOC", sw: doc.scrollWidth, cw: docW, bodyW: Math.round(bodyW), seSW: se.scrollWidth, seCW: se.clientWidth });
    document.querySelectorAll("*").forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.right > docW + 1 || r.left < -1) {
        const cs = getComputedStyle(el);
        out.push({ tag: el.tagName, cls: (el.className && typeof el.className === "string") ? el.className.slice(0,60) : "", right: Math.round(r.right), left: Math.round(r.left), w: Math.round(r.width), pos: cs.position, ww: cs.whiteSpace?.slice(0,20) });
      }
    });
    return out.slice(0, 24);
  })())`);
  console.log(`OFFENDERS /${route}:`);
  const arr = JSON.parse(bad);
  arr.forEach(o => console.log("  ", o.at || o.tag, o.cls || "", `L${o.left} R${o.right} W${o.w} pos=${o.pos}`));
}

await cdp(ws, "Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await load(ws, BASE + "/login");
await sleep(300);
await evalJs(ws, `fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"demo@dermai.app",password:"Demo@1234"})}).then(r=>r.status)`);

await findOffenders("dashboard");
await findOffenders("login");

await chrome.kill();