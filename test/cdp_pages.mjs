import { spawn } from "node:child_process";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9343;
const BASE = "http://127.0.0.1:3100";

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + join(process.env.TEMP || ".", "dermai_cdp_pages"),
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
    const info = await evalJs(ws, `JSON.stringify({url:location.href,rs:document.readyState,len:(document.body?document.body.innerText.length:0)})`).catch(() => "{}");
    try {
      const j = JSON.parse(info);
      if (j.rs === "complete" && j.len > 0) return j;
    } catch {}
  }
  throw new Error("load timeout " + url);
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

// capture uncaught page errors
const errors = [];
ws.onmessage = (e) => {
  onMessage(e.data);
  try {
    const m = JSON.parse(e.data.toString());
    if (m.method === "Runtime.exceptionThrown") {
      const d = m.params.exceptionDetails;
      errors.push(d.exception ? d.exception.description : d.text);
    }
  } catch {}
};

// PUBLIC routes - logged out
const publicRoutes = ["/", "/about", "/login", "/signup", "/admin/login"];
for (const p of publicRoutes) {
  try {
    const i = await load(ws, BASE + p);
    const title = await evalJs(ws, `JSON.stringify({t:(document.title||"").slice(0,60), h: (document.querySelector("h1,.page-title,.hero h1")||{}).textContent || "", nav: !!document.querySelector(".navbar")})`);
    const t = JSON.parse(title);
    check(`page renders logged-out ${p}`, i.len > 30 && !i.url.includes("login") === (p === "/login"), `text ${i.len} | ${t.h.slice(0,40)}`);
  } catch (e) {
    check(`page renders logged-out ${p}`, false, e.message);
  }
}

// login then app routes
await load(ws, BASE + "/login");
await sleep(300);
await evalJs(ws, `fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"demo@dermai.app",password:"Demo@1234"})}).then(r=>r.status)`);
check("login api ok", true);

const appRoutes = ["/dashboard", "/screening", "/history", "/doctors", "/chat", "/nutrition", "/reminders", "/profile", "/settings"];
for (const p of appRoutes) {
  try {
    const i = await load(ws, BASE + p);
    await sleep(500);
    const info = await evalJs(ws, `JSON.stringify({len:document.body.innerText.length, h: (document.querySelector("h1,.page-title")||{}).textContent||"", url: location.pathname, userMenu: !!document.querySelector(".user-menu"), spinner: document.body.innerText.includes("Loading")})`);
    const t = JSON.parse(info);
    const ok = t.len > 30 && !t.spinner && !t.url.includes("login");
    check(`app page works ${p}`, ok, `text ${t.len} | ${t.h.slice(0,40)} | url ${t.url}`);
  } catch (e) {
    check(`app page works ${p}`, false, e.message);
  }
}

// screening flow renders step-1 (questionnaire driven)
try {
  await load(ws, BASE + "/screening");
  await sleep(1200);
  const s = await evalJs(ws, `JSON.stringify({len:document.body.innerText.length, err: document.body.innerText.includes("Error") || document.body.innerText.includes("error"), btn: !!document.querySelector(".btn-primary")})`);
  const t = JSON.parse(s);
  check("screening page loads", t.len > 60 && !t.err, `text ${t.len}`);
} catch (e) { check("screening page loads", false, e.message); }

// admin login page renders
const adminPage = await load(ws, BASE + "/admin/login");
check("admin login renders", adminPage.len > 20);

// uncaught JS errors count
check("no uncaught JS errors on visited pages", errors.length === 0, errors.length + " errors: " + errors[0]);

await chrome.kill();
const failed = results.filter((r) => !r.passes).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);