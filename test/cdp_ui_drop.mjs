import { spawn } from "node:child_process";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9340;
const BASE = "http://127.0.0.1:3100";

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + join(process.env.TEMP || ".", "dermai_cdp_profile10"),
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

const results = [];
const check = (name, passes, detail = "") => {
  results.push({ name, passes });
  console.log(`${passes ? "PASS" : "FAIL"}  ${name}${detail ? "  [" + detail + "]" : ""}`);
};

const ws = await connect(await getWs());
ws.onmessage = (e) => onMessage(e.data);
await cdp(ws, "Page.enable");
await cdp(ws, "Runtime.enable");

await load(ws, BASE + "/login");
await sleep(300);
await evalJs(ws, `fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"demo@dermai.app",password:"Demo@1234"})}).then(r=>r.status)`);
await load(ws, BASE + "/dashboard");
await sleep(700);

// click-to-open via React onClick
const cssHasHover = await evalJs(ws, `(() => {
  let found = false;
  for (const sheet of document.styleSheets) {
    try { for (const rule of sheet.cssRules) {
      if (rule.selectorText && rule.selectorText.includes(".user-menu:hover .user-dropdown") && rule.style.visibility === "visible") found = true;
    } } catch {}
  }
  return found;
})()`);
check("css has :hover visible rule", cssHasHover);

await evalJs(ws, `document.querySelector(".user-menu-trigger").click(); true`);
await sleep(300);
const onOpen = await evalJs(ws, `JSON.stringify({ cls: document.querySelector(".user-menu").className, vis: getComputedStyle(document.querySelector(".user-dropdown")).visibility })`);
console.log("AFTER CLICK:", onOpen);
try { const o = JSON.parse(onOpen); check("dropdown visible after click", o.vis === "visible" && o.cls.includes("open")); } catch {}

// focus-within path: dispatch real focus
await evalJs(ws, `document.querySelector(".user-menu").classList.remove("open"); document.querySelector(".user-menu-trigger").focus(); true`);
await sleep(300);
const focusVis = await evalJs(ws, `getComputedStyle(document.querySelector(".user-dropdown")).visibility`);
check("dropdown visible on focus-within", focusVis === "visible");

// real CDP mouse move over trigger -> enter event
await cdp(ws, "Runtime.evaluate", { expression: `document.querySelector(".user-menu-trigger").blur(); true` });
const rect = await evalJs(ws, `JSON.stringify((()=>{const r=document.querySelector(".user-menu-trigger").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})())`);
const { x, y } = JSON.parse(rect);
await cdp(ws, "Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
await sleep(400);
const hoverVis = await evalJs(ws, `getComputedStyle(document.querySelector(".user-dropdown")).visibility`);
check("dropdown visible on real hover", hoverVis === "visible", hoverVis);

await chrome.kill();
const failed = results.filter((r) => !r.passes).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);