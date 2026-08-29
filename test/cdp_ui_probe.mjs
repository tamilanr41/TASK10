import { spawn } from "node:child_process";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9342;
const BASE = "http://127.0.0.1:3100";

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + join(process.env.TEMP || ".", "dermai_cdp_profile12"),
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
  for (let i = 0; i < 50; i++) {
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

await load(ws, BASE + "/login");
await sleep(300);
await evalJs(ws, `fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"demo@dermai.app",password:"Demo@1234"})}).then(r=>r.status)`);
await load(ws, BASE + "/dashboard");
await sleep(700);

// inspect trigger rect + elementFromPoint BEFORE/at the point
const probe = await evalJs(ws, `JSON.stringify((()=>{
  const t = document.querySelector(".user-menu-trigger");
  const r = t.getBoundingClientRect();
  const px = r.x + r.width/2, py = r.y + r.height/2;
  const under = document.elementFromPoint(px, py);
  return {
    rect: { x:r.x, y:r.y, w:r.width, h:r.height },
    px, py,
    underTag: under && under.tagName,
    underCls: under && under.className,
    underIsTrigger: under === t,
    matches: t.matches(":hover"),
    visNow: getComputedStyle(document.querySelector(".user-dropdown")).visibility
  };
})())`);
console.log("PROBE BEFORE:", probe);

// now move the pointer onto it
const p = JSON.parse(probe);
await cdp(ws, "Input.dispatchMouseEvent", { type: "mouseMoved", x: p.px, y: p.py });
await sleep(500);

const after = await evalJs(ws, `JSON.stringify((()=>{
  const t = document.querySelector(".user-menu-trigger");
  const drop = document.querySelector(".user-dropdown");
  return { matches: t.matches(":hover"), vis: getComputedStyle(drop).visibility, cachedHover: drop.closest(".user-menu").matches(":hover") };
})())`);
console.log("AFTER MOVE:", after);

// try clicking mid to focus window (headless may not have focus)
await cdp(ws, "Input.dispatchMouseEvent", { type: "mousePressed", x: p.px, y: p.py, button: "left", clickCount: 1 });
await cdp(ws, "Input.dispatchMouseEvent", { type: "mouseReleased", x: p.px, y: p.py, button: "left", clickCount: 1 });
await sleep(400);
const afterClick = await evalJs(ws, `JSON.stringify((()=>{ const t=document.querySelector(".user-menu-trigger"); const drop=document.querySelector(".user-dropdown"); return { matches:t.matches(":hover"), vis:getComputedStyle(drop).visibility, cls: t.closest(".user-menu").className, hasFocus: document.hasFocus() }; })())`);
console.log("AFTER PRESS+RELEASE:", afterClick);

await chrome.kill();