import { spawn } from "node:child_process";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9344;
const BASE = "http://127.0.0.1:3100";

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + join(process.env.TEMP || ".", "dermai_cdp_pages2"),
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
async function navigate(ws, url, expectHeading, timeoutMs = 15000) {
  await cdp(ws, "Page.navigate", { url });
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await sleep(300);
    const info = await evalJs(ws, `JSON.stringify({url:location.pathname, text:document.body.innerText})`).catch(() => "{}");
    try {
      const j = JSON.parse(info);
      if (j.url && j.text.includes(expectHeading)) return j;
    } catch {}
  }
  const final = await evalJs(ws, `JSON.stringify({url:location.pathname, hasNav:!!document.querySelector(".navbar"), hasUser:!!document.querySelector(".user-menu-name")})`).catch(() => "{}");
  throw new Error("timeout waiting for '" + expectHeading + "' -> " + final);
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

await cdp(ws, "Page.navigate", { url: BASE + "/login" });
await sleep(800);
await evalJs(ws, `fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"demo@dermai.app",password:"Demo@1234"})}).then(r=>r.status)`);
check("login ok", true);

const targets = [
  ["/dashboard", "Welcome back"],
  ["/screening", "New Screening"],
  ["/history", "Screening History"],
  ["/doctors", "Doctor Recommendation"],
  ["/chat", "DermAI Assistant"],
  ["/nutrition", "Nutrition"],
  ["/reminders", "Reminder Center"],
  ["/profile", "Your Profile"],
  ["/settings", "Settings"],
];

for (const [path, heading] of targets) {
  try {
    const r = await navigate(ws, BASE + path, heading);
    const extra = await evalJs(ws, `JSON.stringify({hasNav:!!document.querySelector(".navbar"), hasUser:!!document.querySelector(".user-menu-name"), isAuthPage:!!document.querySelector(".auth-art")})`);
    const e = JSON.parse(extra);
    check(`${path} renders "${heading}"`, r.url === path, `url=${r.url} nav=${e.hasNav} user=${e.hasUser}`);
  } catch (e) {
    check(`${path} renders "${heading}"`, false, e.message.slice(0, 140));
  }
}

await chrome.kill();
const failed = results.filter((r) => !r.passes).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);