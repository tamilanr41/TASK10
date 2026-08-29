import { spawn } from "node:child_process";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9348;
const BASE = "http://127.0.0.1:3100";

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + join(process.env.TEMP || ".", "dermai_cdp_fonts"),
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
await sleep(900);

// fonts loaded via document.fonts
const fonts = await evalJs(ws, `JSON.stringify({ status: document.fonts.status, families: [...document.fonts].map(f => f.family).slice(0,8) })`);
console.log("FONTS:", fonts);
try {
  const f = JSON.parse(fonts);
  check("web fonts loaded", f.status === "loaded", f.status);
  check("custom families present", f.families.some(x => /Inter|Outfit|JetBrains/i.test(x)), f.families.join());
} catch {}

// computed font-family on body, h1, brand, mono chip
const comp = await evalJs(ws, `JSON.stringify({
  body: getComputedStyle(document.body).fontFamily.slice(0, 60),
  h1: getComputedStyle(document.querySelector(".hero h1")).fontFamily.slice(0, 60),
  brand: getComputedStyle(document.querySelector(".brand")).fontFamily.slice(0, 60),
  theirCheck: (() => { const f = getComputedStyle(document.body).fontFamily; return f.toLowerCase().includes("inter"); })()
})`);
console.log("COMPUTED:", comp);
try {
  const c = JSON.parse(comp);
  check("body uses Inter", c.theirCheck, c.body);
  check("h1 uses display font (Outfit)", c.h1.toLowerCase().includes("outfit"), c.h1);
  check("brand uses display font", c.brand.toLowerCase().includes("outfit"), c.brand);
} catch {}

// actual rendered font (not fallback): measure document.fonts.check
const rendered = await evalJs(ws, `JSON.stringify({ inter: document.fonts.check('16px Inter'), outfit: document.fonts.check('16px Outfit'), mono: document.fonts.check('12px "JetBrains Mono"') })`);
console.log("RENDERED:", rendered);
try { const r = JSON.parse(rendered); check("Inter actually available", r.inter); check("Outfit actually available", r.outfit); check("JetBrains Mono available", r.mono); } catch {}

// hero centered
const hero = await evalJs(ws, `JSON.stringify((()=>{
  const inner = document.querySelector(".hero-inner");
  const h1 = document.querySelector(".hero h1");
  const p = document.querySelector(".hero p");
  const cta = document.querySelector(".hero-cta");
  const ir = inner.getBoundingClientRect();
  const h1r = h1.getBoundingClientRect();
  const pr = p.getBoundingClientRect();
  const ca = cta.getBoundingClientRect();
  const center = ir.x + ir.width/2;
  return {
    textAlign: getComputedStyle(inner).textAlign,
    h1Centered: Math.abs((h1r.x + h1r.width/2) - center) < 4,
    pCentered: Math.abs((pr.x + pr.width/2) - center) < 4,
    ctaCentered: Math.abs((ca.x + ca.width/2) - center) < 4,
    col: getComputedStyle(inner).flexDirection
  };
})())`);
console.log("HERO CENTER:", hero);
try {
  const h = JSON.parse(hero);
  check("hero text center aligned", h.textAlign === "center");
  check("h1 centered", h.h1Centered);
  check("paragraph centered", h.pCentered);
  check("CTA centered", h.ctaCentered);
} catch {}

// navbar centered
const nav = await evalJs(ws, `JSON.stringify((()=>{
  const n = document.querySelector(".navbar-inner");
  const r = n.getBoundingClientRect();
  const links = document.querySelector(".nav-links").getBoundingClientRect();
  const brand = document.querySelector(".brand").getBoundingClientRect();
  const center = r.x + r.width/2;
  return {
    linksCentered: Math.abs((links.x + links.width/2) - center) < 30,
    brandX: Math.round(brand.x), linksX: Math.round(links.x)
  };
})())`);
console.log("NAV CENTER:", nav);
try { const n = JSON.parse(nav); check("navbar links centered", n.linksCentered, "brandLeft=" + n.brandX + " linksCenterNear=" ); } catch {}

await chrome.kill();
const failed = results.filter((r) => !r.passes).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);