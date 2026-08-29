import { spawn } from "node:child_process";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9349;
const BASE = "http://127.0.0.1:3100";

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + join(process.env.TEMP || ".", "dermai_cdp_mobilecheck"),
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

// DESKTOP navbar group centered
await cdp(ws, "Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await load(ws, BASE + "/");
await sleep(600);
const nav = await evalJs(ws, `JSON.stringify((()=>{
  const n = document.querySelector(".navbar");
  const inner = document.querySelector(".navbar-inner");
  const links = document.querySelector(".nav-links");
  const brand = document.querySelector(".brand");
  const nr = n.getBoundingClientRect();
  const bc = (brand.getBoundingClientRect().left + brand.getBoundingClientRect().right) / 2;
  const lc = (links.getBoundingClientRect().left + links.getBoundingClientRect().right) / 2;
  const groupCenter = (bc + lc) / 2 - (bc - brand.getBoundingClientRect().left) / 2;
  const navCenter = nr.left + nr.width / 2;
  const brandEdge = brand.getBoundingClientRect();
  const linksRect = links.getBoundingClientRect();
  const midBetween = (brandEdge.right + linksRect.left) / 2;
  const spanCenter = (brandEdge.left + linksRect.right) / 2;
  return {
    navCenter: Math.round(navCenter),
    spanCenter: Math.round(spanCenter),
    centered: Math.abs(spanCenter - navCenter) < 8,
    justify: getComputedStyle(inner).justifyContent,
    brandLeft: Math.round(brandEdge.left), linksRight: Math.round(linksRect.right)
  };
})())`);
console.log("GROUP CENTER:", nav);
try { const n = JSON.parse(nav); check("navbar brand+links group centered", n.centered, "navCenter=" + n.navCenter + " spanCenter=" + n.spanCenter); check("justify center", n.justify === "center"); } catch {}

// MOBILE: disclaimer marquee single line + hero single column, no wrap errors
await cdp(ws, "Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await load(ws, BASE + "/");
await sleep(700);
const mob = await evalJs(ws, `JSON.stringify((()=>{
  const db = document.querySelector(".disclaimer-bar");
  const inner = document.querySelector(".disclaimer-bar-inner");
  const dbc = getComputedStyle(db);
  const dbRect = db.getBoundingClientRect();
  const innerRect = inner.getBoundingClientRect();
  const anim = getComputedStyle(inner).animationName;
  return {
    dbNowrap: dbc.whiteSpace === "nowrap",
    dbOverflow: dbc.overflow === "hidden",
    innerRunning: anim === "disclaimerRun",
    marginMask: dbc.maskImage.indexOf("linear-gradient") >= 0 || dbc.webkitMaskImage.indexOf("linear-gradient") >= 0,
    oneLine: dbRect.height < 40,
    over: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    heroCol: getComputedStyle(document.querySelector(".hero-inner")).flexDirection,
    textCenter: getComputedStyle(document.querySelector(".hero-inner")).textAlign
  };
})())`);
console.log("MOBILE BANNER:", mob);
try {
  const m = JSON.parse(mob);
  check("disclaimer single line (nowrap+hidden)", m.dbNowrap && m.dbOverflow && m.oneLine);
  check("disclaimer marquee animation running", m.innerRunning);
  check("disclaimer edge fade mask", m.marginMask);
  check("no horizontal overflow", !m.over);
  check("hero centered on mobile", m.heroCol === "column" && m.textCenter === "center");
} catch {}

// hero CTA single line on mobile
const cta = await evalJs(ws, `JSON.stringify((()=>{
  const c = document.querySelector(".hero-cta");
  const btns = [...c.querySelectorAll(".btn")].map(b => b.getBoundingClientRect().top);
  return { nowrap: getComputedStyle(c).flexWrap === "nowrap", sameRow: btns.length > 1 && btns.every(t => Math.abs(t - btns[0]) < 2) };
})())`);
console.log("CTA:", cta);
try { const c = JSON.parse(cta); check("hero CTA single line on mobile", c.nowrap && c.sameRow, JSON.stringify(c)); } catch {}

// dashboard renders fine with fonts
await load(ws, BASE + "/login");
await sleep(300);
await evalJs(ws, `fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"demo@dermai.app",password:"Demo@1234"})}).then(r=>r.status)`);
await load(ws, BASE + "/dashboard");
await sleep(600);
const dash = await evalJs(ws, `JSON.stringify({len: document.body.innerText.length, fontsOk: document.fonts.check('16px Inter'), over: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1})`);
console.log("DASH:", dash);
try { const d = JSON.parse(dash); check("dashboard renders with new fonts", d.len > 100 && d.fontsOk && !d.over, "len=" + d.len); } catch {}

await chrome.kill();
const failed = results.filter((r) => !r.passes).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);