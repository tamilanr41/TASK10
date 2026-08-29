import { spawn } from "node:child_process";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9341;
const BASE = "http://127.0.0.1:3100";

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + join(process.env.TEMP || ".", "dermai_cdp_profile11"),
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
await cdp(ws, "Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await sleep(200);

await load(ws, BASE + "/login");
await sleep(300);
await evalJs(ws, `fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"demo@dermai.app",password:"Demo@1234"})}).then(r=>r.status)`);
await load(ws, BASE + "/dashboard");
await sleep(700);

// move mouse to far corner first, then onto the trigger (crossing) -> real mouseenter
const corner = await evalJs(ws, `JSON.stringify({x:5,y:5})`);
const c1 = JSON.parse(corner);
await cdp(ws, "Input.dispatchMouseEvent", { type: "mouseMoved", x: c1.x, y: c1.y });
await sleep(100);

const rect = JSON.parse(await evalJs(ws, `JSON.stringify((()=>{const r=document.querySelector(".user-menu-trigger").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})())`));
await cdp(ws, "Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x, y: rect.y });
await sleep(500);
const hoverVis = await evalJs(ws, `getComputedStyle(document.querySelector(".user-dropdown")).visibility`);
console.log("HOVER VIS:", hoverVis);
console.log(hoverVis === "visible" ? "PASS  dropdown visible on real hover" : "FAIL  dropdown visible on real hover  [" + hoverVis + "]");

// tab into trigger -> focus-within
const cur = await evalJs(ws, `JSON.stringify({tag:document.activeElement&&document.activeElement.tagName})`);
await cdp(ws, "Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", windowsVirtualKeyCode: 9, code: "Tab" });
await cdp(ws, "Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", windowsVirtualKeyCode: 9, code: "Tab" });
await sleep(200);
await cdp(ws, "Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", windowsVirtualKeyCode: 9, code: "Tab" });
await cdp(ws, "Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", windowsVirtualKeyCode: 9, code: "Tab" });
await sleep(100);
const active = await evalJs(ws, `JSON.stringify({tag:document.activeElement&&document.activeElement.tagName, cls: document.activeElement&&document.activeElement.className})`);
const activeObj = JSON.parse(active);
const focusVis = await evalJs(ws, `getComputedStyle(document.querySelector(".user-dropdown")).visibility`);
console.log("ACTIVE:", activeObj.tag, activeObj.cls, "| DROP VIS:", focusVis);
console.log(focusVis === "visible" ? "PASS  dropdown visible on focus-within" : "INFO  focus-within path: " + focusVis);

await chrome.kill();