import { spawn } from "node:child_process";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9347;
const BASE = "http://127.0.0.1:3100";

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + join(process.env.TEMP || ".", "dermai_cdp_float"),
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

const results = [];
const check = (name, passes, detail = "") => {
  results.push({ name, passes });
  console.log(`${passes ? "PASS" : "FAIL"}  ${name}${detail ? "  [" + detail + "]" : ""}`);
};

const ws = await connect(await getWs());
ws.onmessage = (e) => onMessage(e.data);
await cdp(ws, "Page.enable");
await cdp(ws, "Runtime.enable");
await cdp(ws, "Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

await load(ws, BASE + "/");
const info = await evalJs(ws, `JSON.stringify((()=>{
  const n = document.querySelector(".navbar");
  const r = n.getBoundingClientRect();
  const cs = getComputedStyle(n);
  return {
    x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width),
    radius: cs.borderRadius, pos: cs.position, top: cs.top,
    marginTop: cs.marginTop, borderNature: cs.borderBottomWidth + " " + cs.borderTopWidth,
    bg: cs.backgroundColor, hasShadow: cs.boxShadow !== "none"
  };
})())`);
console.log("FLOAT NAV:", info);
try {
  const t = JSON.parse(info);
  check("navbar is sticky", t.pos === "sticky");
  check("navbar floats from top (top offset)", parseInt(t.top) >= 8, "top=" + t.top);
  check("navbar rounded", t.radius.includes("18px"), t.radius);
  check("navbar has side margins (not full width)", t.x > 0, "x=" + t.x);
  check("navbar has shadow", t.hasShadow);
} catch (e) { console.log("parse err", e.message); }

// login and check dropdown still positioned within floating bar on desktop
await load(ws, BASE + "/login");
await sleep(300);
await evalJs(ws, `fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"demo@dermai.app",password:"Demo@1234"})}).then(r=>r.status)`);
await load(ws, BASE + "/dashboard");
await sleep(600);
const drop = await evalJs(ws, `JSON.stringify((()=>{
  const um = document.querySelector(".user-menu");
  const t = um.getBoundingClientRect();
  const d = document.querySelector(".user-dropdown");
  const dr = d.getBoundingClientRect();
  return { menuY: Math.round(t.y), dropY: Math.round(dr.y), below: dr.y > t.y, navRect: JSON.stringify((()=>{const r=document.querySelector(".navbar").getBoundingClientRect();return {y:Math.round(r.y),b:Math.round(r.bottom)}})()) };
})())`);
console.log("DROP POSITION:", drop);
try { const d = JSON.parse(drop); check("dropdown opens below trigger", d.below, "menuY=" + d.menuY + " dropY=" + d.dropY); } catch {}

// hover still works
const rect = JSON.parse(await evalJs(ws, `JSON.stringify((()=>{const r=document.querySelector(".user-menu-trigger").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})())`));
await cdp(ws, "Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 5 });
await sleep(80);
await cdp(ws, "Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x, y: rect.y });
await sleep(500);
const hv = await evalJs(ws, `getComputedStyle(document.querySelector(".user-dropdown")).visibility`);
check("dropdown visible on hover", hv === "visible", hv);

// mobile: floating bar + dropdown panel
await cdp(ws, "Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await load(ws, BASE + "/");
const mob = await evalJs(ws, `JSON.stringify((()=>{
  const n = document.querySelector(".navbar");
  const r = n.getBoundingClientRect();
  const cs = getComputedStyle(n);
  return { y: Math.round(r.y), w: Math.round(r.width), r: cs.borderRadius, over: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
})())`);
console.log("MOBILE FLOAT:", mob);
try { const m = JSON.parse(mob); check("mobile navbar floats (top offset)", m.y >= 8, "y=" + m.y); check("mobile navbar rounded", m.r.includes("px")); check("mobile no horizontal overflow", !m.over); } catch {}

await evalJs(ws, `document.querySelector(".mobile-toggle").click(); true`);
await sleep(350);
const panel = await evalJs(ws, `JSON.stringify((()=>{
  const n = document.querySelector(".nav-links");
  const cs = getComputedStyle(n);
  const r = n.getBoundingClientRect();
  return { open: n.classList.contains("open"), radius: cs.borderRadius, topGap: Boolean(cs.top.includes("8")||cs.top.includes("100")) };
})())`);
console.log("MOBILE PANEL:", panel);
try { const m = JSON.parse(panel); check("mobile menu panel opens", m.open); check("mobile panel rounded", m.radius.includes("14px"), m.radius); } catch {}

await chrome.kill();
const failed = results.filter((r) => !r.passes).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);