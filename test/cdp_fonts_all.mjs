import { spawn } from "node:child_process";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9350;
const BASE = "http://127.0.0.1:3100";

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + join(process.env.TEMP || ".", "dermai_cdp_allfonts"),
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
await sleep(800);

// fonts loaded
const fonts = await evalJs(ws, `JSON.stringify({ status: document.fonts.status, fams: [...document.fonts].map(f => f.family) })`);
console.log("FONTS:", fonts);
try {
  const f = JSON.parse(fonts);
  check("web fonts loaded", f.status === "loaded", f.status);
  const fams = f.fams.join();
  check("Outfit present", fams.includes("Outfit"), fams.slice(0,80));
  check("JetBrains Mono present", fams.includes("JetBrains"), "ok");
  check("Inter NOT bundled (removed)", !fams.includes("Inter"), "ok");
} catch {}

// every element type uses Outfit
const all = await evalJs(ws, `JSON.stringify((()=>{
  const els = {
    body: [document.body],
    h1: document.querySelectorAll("h1"),
    h2: document.querySelectorAll("h2"),
    p: document.querySelectorAll(".hero p"),
    btn: document.querySelectorAll(".btn"),
    navLink: document.querySelectorAll(".nav-links a, .nav-link"),
    brand: document.querySelectorAll(".brand"),
  };
  const out = {};
  for (const [k, nl] of Object.entries(els)) {
    const ff = [];
    nl.forEach(el => ff.push(getComputedStyle(el).fontFamily));
    out[k] = ff.every(f => f.toLowerCase().includes("outfit"));
  }
  return out;
})())`);
console.log("ELEMENT FONTS:", all);
try { const a = JSON.parse(all); for (const [k, v] of Object.entries(a)) check(k + " uses Outfit", v); } catch {}

// rendered check
const rendered = await evalJs(ws, `JSON.stringify({ outfit: document.fonts.check('16px Outfit'), mono: document.fonts.check('12px "JetBrains Mono"') })`);
try { const r = JSON.parse(rendered); check("Outfit renders", r.outfit); check("JetBrains renders", r.mono); } catch {}

// login page: form controls use Outfit
await load(ws, BASE + "/login");
await sleep(500);
await evalJs(ws, `fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"admin@dermai.app",password:"Admin@1234"})}).then(r=>r.status)`);
const form = await evalJs(ws, `JSON.stringify({
  input: getComputedStyle(document.querySelector(".input")).fontFamily.toLowerCase().includes("outfit"),
  label: getComputedStyle(document.querySelector(".field label")).fontFamily.toLowerCase().includes("jetbrains"),
  btn: getComputedStyle(document.querySelector(".btn")).fontFamily.toLowerCase().includes("outfit")
})`);
console.log("FORM FONTS:", form);
try { const f = JSON.parse(form); check("input uses Outfit", f.input); check("form label uses JetBrains (mono)", f.label); check("form button uses Outfit", f.btn); } catch {}

// admin panel + table use Outfit (mono for th)
await load(ws, BASE + "/admin");
await sleep(600);
const admin = await evalJs(ws, `JSON.stringify({
  body: getComputedStyle(document.body).fontFamily.toLowerCase().includes("outfit"),
  th: getComputedStyle(document.querySelector(".table th")).fontFamily.toLowerCase().includes("jetbrains"),
  td: getComputedStyle(document.querySelector(".table td")).fontFamily.toLowerCase().includes("outfit"),
  rendered: document.fonts.check('16px Outfit')
})`);
console.log("ADMIN FONTS:", admin);
try { const a = JSON.parse(admin); check("admin body uses Outfit", a.body); check("table th uses JetBrains", a.th); check("table td uses Outfit", a.td); check("rendered", a.rendered); } catch {}

await chrome.kill();
const failed = results.filter((r) => !r.passes).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);