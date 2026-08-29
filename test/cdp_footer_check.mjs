import { spawn } from "node:child_process";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9351;
const BASE = "http://127.0.0.1:3100";
const BASE_FALLBACK = "http://127.0.0.1:3000";

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + join(process.env.TEMP || ".", "dermai_cdp_footer"),
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

for (const width of [390, 480, 600, 800]) {
  await cdp(ws, "Emulation.setDeviceMetricsOverride", { width, height: 844, deviceScaleFactor: 1, mobile: true });
  await load(ws, BASE_FALLBACK + "/");
  await sleep(400);
  const info = await evalJs(ws, `JSON.stringify((()=>{
    const f = document.querySelector(".footer");
    const grid = document.querySelector(".footer-grid");
    if (!f || !grid) return { missing: true };
    const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
    const items = [...grid.children].map(c => ({ t: c.classList.contains("footer-brand") ? "brand" : (c.querySelector("h4")||{}).textContent, w: Math.round(c.getBoundingClientRect().width) }));
    const over = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    return { cols, items, over, scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth };
  })())`);
  console.log("W=" + width, info);
}

await chrome.kill();