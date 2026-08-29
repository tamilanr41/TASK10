import { spawn } from "node:child_process";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9339;
const BASE = "http://127.0.0.1:3100";

const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + join(process.env.TEMP || ".", "dermai_cdp_profile9"),
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
    const info = await evalJs(ws, `JSON.stringify({url:location.href, rs:document.readyState, len:(document.body?document.body.innerText.length:0)})`).catch(() => "");
    last = info;
    try {
      const j = JSON.parse(info);
      if (j.rs === "complete" && j.len > 0) return j;
    } catch {}
  }
  return { error: "timeout", last };
}

async function setViewport(ws, w, h = 900) {
  await cdp(ws, "Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
  await sleep(200);
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
ws.onmessage = (e) => { onMessage(e.data); };

// 1. Home hero visual - desktop
await setViewport(ws, 1280);
const home = await load(ws, BASE + "/");
const heroJson = await evalJs(ws, `JSON.stringify({
  slides: document.querySelectorAll(".hero-visual-track img").length,
  active: document.querySelectorAll(".hero-visual-track img.is-active").length,
  dots: document.querySelectorAll(".hero-visual-dots button").length,
  chips: document.querySelectorAll(".hero-visual .hud-chip").length,
  vis: !!document.querySelector(".hero-visual"),
  ring: !!document.querySelector(".hero-visual-ring"),
  loaded: (() => { const i = document.querySelectorAll(".hero-visual-track img"); return [...i].map(im => im.complete && im.naturalWidth > 0); })()
})`);
console.log("HERO:", heroJson);
try { const h = JSON.parse(heroJson); check("hero has 4 slides", h.slides === 4, "slides " + h.slides); check("hero 1 active image", h.active === 1); check("hero dots", h.dots === 4); check("hero chips", h.chips === 2); check("hero images loaded", h.loaded.filter(Boolean).length === 4); } catch (e) { console.log("hero parse err", e.message); }

// navbar logged out
const navOut = await evalJs(ws, `JSON.stringify({
  links: [...document.querySelectorAll(".nav-link")].map(a => a.textContent.trim()),
  toggle: !!document.querySelector(".mobile-toggle"),
  cta: document.querySelector(".nav-cta")?.textContent.trim()
})`);
console.log("NAV OUT:", navOut);
try { const n = JSON.parse(navOut); check("has Home/Login/Signup", n.links.includes("Home") && n.links.includes("Login") && n.cta === "Sign up"); check("no user menu when logged out", !document.querySelector(".user-menu")); } catch {}

// 2. Login
await load(ws, BASE + "/login");
await sleep(300);
const loginRes = await evalJs(ws, `fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"demo@dermai.app",password:"Demo@1234"})}).then(async r=>{return r.status})`);
check("login ok", loginRes === 200, "status " + loginRes);

// 3. Go to dashboard, check navbar shows name + dropdown + Dashboard link
await load(ws, BASE + "/dashboard");
await sleep(600);
const navIn = await evalJs(ws, `JSON.stringify({
  name: document.querySelector(".user-menu-name")?.textContent.trim(),
  avatar: document.querySelector(".avatar")?.textContent.trim(),
  hasMenu: !!document.querySelector(".user-menu"),
  dropdownItems: [...document.querySelectorAll(".user-dropdown-item")].map(a => a.textContent.trim()),
  hasDash: [...document.querySelectorAll(".nav-link")].some(a => a.textContent.trim() === "Dashboard"),
  dropHidden: getComputedStyle(document.querySelector(".user-dropdown")).visibility
})`);
console.log("NAV LOGGED IN:", navIn);
try {
  const n = JSON.parse(navIn);
  check("user name shown", !!n.name, n.name);
  check("avatar initials", !!n.avatar, n.avatar);
  check("dashboard link present", n.hasDash);
  check("dropdown items", n.dropdownItems.join(",").includes("Logout") && n.dropdownItems.includes("Dashboard"));
  check("dropdown hidden by default", n.dropHidden === "hidden");
} catch (e) { console.log("nav parse err", e.message); }

// hover shows dropdown
const hover = await evalJs(ws, `(() => { document.querySelector(".user-menu").dispatchEvent(new MouseEvent("mouseenter", {bubbles:true})); return true; })()`);
await sleep(400);
const dropVis = await evalJs(ws, `getComputedStyle(document.querySelector(".user-dropdown")).visibility`);
check("dropdown visible on hover", dropVis === "visible", dropVis);

// logout from dropdown
await evalJs(ws, `(() => { const items = [...document.querySelectorAll(".user-dropdown-item")]; const b = items.find(i => i.textContent.trim() === "Logout"); b.click(); return true; })()`);
await sleep(1000);
const loggedOut = await evalJs(ws, `JSON.stringify({ userMenu: !!document.querySelector(".user-menu"), login: [...document.querySelectorAll(".nav-link")].some(a=>a.textContent.trim()==="Login"), url: location.pathname })`);
console.log("AFTER LOGOUT:", loggedOut);
try { const l = JSON.parse(loggedOut); check("logout returns to home", l.url === "/", l.url); check("user menu removed", !l.userMenu); } catch {}

// 4. Mobile viewport check on home
await setViewport(ws, 390, 844);
await load(ws, BASE + "/");
const mob = await evalJs(ws, `JSON.stringify({
  toggleVisible: getComputedStyle(document.querySelector(".mobile-toggle")).display !== "none",
  navClosed: !document.querySelector(".nav-links").classList.contains("open"),
  heroVis: !!document.querySelector(".hero-visual")
})`);
console.log("MOBILE:", mob);
try { const m = JSON.parse(mob); check("mobile toggle visible", m.toggleVisible); check("nav closed by default", m.navClosed); check("hero visual on mobile", m.heroVis); } catch {}

// open mobile menu, then login and check dropdown works in mobile menu too
await evalJs(ws, `document.querySelector(".mobile-toggle").click(); true`);
await sleep(300);
const mobOpen = await evalJs(ws, `JSON.stringify({ open: document.querySelector(".nav-links").classList.contains("open"), links: document.querySelectorAll(".nav-link").length })`);
console.log("MOBILE MENU:", mobOpen);
try { const m = JSON.parse(mobOpen); check("mobile menu opens", m.open && m.links >= 6); } catch {}

await chrome.kill();

const failed = results.filter((r) => !r.passes).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);