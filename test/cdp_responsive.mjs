import { spawn } from "node:child_process";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9345;
const BASE = "http://127.0.0.1:3100";

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + join(process.env.TEMP || ".", "dermai_cdp_resp"),
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

// login once
await cdp(ws, "Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await load(ws, BASE + "/login");
await sleep(300);
await evalJs(ws, `fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"demo@dermai.app",password:"Demo@1234"})}).then(r=>r.status)`);

const viewports = [
  { w: 360, h: 740, label: "mobile 360" },
  { w: 390, h: 844, label: "mobile 390" },
  { w: 768, h: 1024, label: "tablet 768" },
  { w: 1024, h: 768, label: "laptop 1024" },
  { w: 1440, h: 900, label: "desktop 1440" },
];

const routes = ["/", "/dashboard", "/screening"];

for (const v of viewports) {
  await cdp(ws, "Emulation.setDeviceMetricsOverride", { width: v.w, height: v.h, deviceScaleFactor: 1, mobile: v.w < 600 });
  await sleep(150);
  for (const route of routes) {
    await load(ws, BASE + route);
    await sleep(400);
    const info = await evalJs(ws, `JSON.stringify((()=>{
      const s = document.scrollingElement;
      const overX = s.scrollWidth > s.clientWidth + 1;
      const toggle = document.querySelector(".mobile-toggle");
      const toggleVisible = toggle ? getComputedStyle(toggle).display !== "none" : false;
      const hero = !!document.querySelector(".hero-visual");
      return { cx: s.clientWidth, sx: s.scrollWidth, overX, toggleVisible, hero, navOpen: document.querySelector(".nav-links")?.classList.contains("open") || false };
    })())`);
    const t = JSON.parse(info);
    const ok = !t.overX;
    check(`${v.label} ${route} no horizontal overflow`, ok, `client=${t.cx} scroll=${t.sx}${t.toggleVisible ? " toggle-show" : ""}${t.hero ? " hero" : ""}`);
  }
}

// verify mobile: toggle menu opens, all nav links reachable, then login view
await cdp(ws, "Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await load(ws, BASE + "/");
await evalJs(ws, `document.querySelector(".mobile-toggle").click(); true`);
await sleep(300);
const m = await evalJs(ws, `JSON.stringify({open: document.querySelector(".nav-links").classList.contains("open"), links: [...document.querySelectorAll(".nav-link")].map(a=>a.textContent.trim()), dashPresent: [...document.querySelectorAll(".nav-link")].some(a=>a.textContent.trim()==="Dashboard"), userMenu: !!document.querySelector(".user-menu")})`);
console.log("MOBILE MENU LINKS:", m);
try {
  const j = JSON.parse(m);
  check("mobile menu opens on tablet/mobile", j.open);
  check("mobile shows Dashboard + user menu", j.dashPresent && j.userMenu, "dash=" + j.dashPresent);
} catch {}

// mobile auth page renders (no art on mobile)
await load(ws, BASE + "/login");
await sleep(300);
const ml = await evalJs(ws, `JSON.stringify({len: document.body.innerText.length, art: !!document.querySelector(".auth-art"), over: document.scrollingElement.scrollWidth > document.scrollingElement.clientWidth + 1})`);
console.log("MOBILE LOGIN:", ml);
try { const j = JSON.parse(ml); check("mobile login renders no overflow", j.len > 50 && !j.over, "len=" + j.len); } catch {}

await chrome.kill();
const failed = results.filter((r) => !r.passes).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);