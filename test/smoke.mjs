import { spawn } from "node:child_process";
import { deflateSync } from "node:zlib";
import { appendFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const PORT = 3100;
const BASE = `http://127.0.0.1:${PORT}`;

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}
function makePng(size = 64) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 3);
    raw[rowStart] = 0; // filter none
    for (let x = 0; x < size; x++) {
      const off = rowStart + 1 + x * 3;
      raw[off] = (x * 4) % 256;
      raw[off + 1] = (y * 4) % 256;
      raw[off + 2] = 128;
    }
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

const results = [];
function check(name, passes, detail = "") {
  results.push({ name, passes });
  console.log(`${passes ? "PASS" : "FAIL"}  ${name}${detail ? "  [" + detail + "]" : ""}`);
}

let server = null;
let cookie = "";

async function waitReady(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url, { redirect: "manual" });
      if (r.status < 500) return;
    } catch {
      /* not up yet */
    }
    await new Promise((res) => setTimeout(res, 300));
  }
  throw new Error("Server did not become ready in time");
}

async function req(path, { method = "GET", body, headers = {}, raw = false } = {}) {
  const opts = { method, headers: { ...headers } };
  if (cookie) opts.headers.cookie = cookie;
  if (body !== undefined) {
    if (!raw) opts.headers["content-type"] = "application/json";
    opts.body = body;
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  let data = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("json")) data = await res.json();
  else data = await res.text();
  return { status: res.status, data, headers: res.headers };
}

const TINY_PNG = makePng(64);

async function run() {
  if (!process.env.DERMAI_AWAIT_SERVER) {
    server = spawn(process.execPath, ["server-dist/index.cjs"], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        PORT: String(PORT),
        NODE_ENV: "production",
        DATA_DIR: path.join(os.tmpdir(), `dermai-smoke-${Date.now()}`),
      },
    });
    server.stderr.on("data", (d) => appendFileSync(path.join(os.tmpdir(), "dermai-smoke-child.log"), d));
    server.stdout.on("data", (d) => appendFileSync(path.join(os.tmpdir(), "dermai-smoke-child.log"), d));
  }
  await waitReady(`${BASE}/`);

  // ------------------------------------------------------------ public pages
  for (const [path, label] of [
    ["/", "home"],
    ["/about", "about"],
    ["/login", "login"],
    ["/signup", "signup"],
    ["/admin/login", "admin login"],
  ]) {
    const r = await req(path);
    check(`GET ${label} renders`, r.status === 200 && String(r.data).length > 50, `status ${r.status}`);
  }

  // ------------------------------------------------------------ questionnaire
  const q = await req("/api/questionnaire?type=combined&stage=general");
  check(
    "questionnaire general stage",
    q.status === 200 && Array.isArray(q.data.questions) && q.data.questions.length >= 5,
    `questions ${q.data?.questions?.length}`
  );
  const qArea = await req(
    "/api/questionnaire?type=scalp&stage=area&answers=" + encodeURIComponent(JSON.stringify({ itching: "yes" }))
  );
  const hasItchSeverity = qArea.data.questions.some((x) => x.id === "itching_severity");
  check("questionnaire show_if", qArea.status === 200 && hasItchSeverity);
  const qBad = await req("/api/questionnaire?type=bad&stage=general");
  check("questionnaire invalid type rejected", qBad.status === 400);

  // ------------------------------------------------------------ auth
  const email = `smoke_${Date.now()}@example.com`;
  const reg = await req("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Smoke User",
      email,
      password: "StrongPass1",
      confirm_password: "StrongPass1",
      age: 28,
      sex: "other",
    }),
  });
  check("register", reg.status === 201, `status ${reg.status} body ${JSON.stringify(reg.data).slice(0, 80)}`);

  const dup = await req("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "Dupe Name", email, password: "StrongPass1", confirm_password: "StrongPass1" }),
  });
  check("duplicate email 409", dup.status === 409, `status ${dup.status} body ${JSON.stringify(dup.data).slice(0, 120)}`);

  const badLogin = await req("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: "wrongpass" }),
  });
  check("wrong password 401", badLogin.status === 401);

  const login = await req("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: "StrongPass1" }),
  });
  check("login + cookie", login.status === 200 && Boolean(cookie), `status ${login.status}`);
  const userCookie = cookie;

  const me = await req("/api/auth/me");
  check("me", me.status === 200 && me.data.user?.email === email);

  const regBad = await req("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "A", email: "bad", password: "short", confirm_password: "nope" }),
  });
  check("register validation fields", regBad.status === 400 && Boolean(regBad.data.fields));

  // ------------------------------------------------------------ screening
  const fd = new FormData();
  fd.append("screening_type", "combined");
  fd.append("scalp_image", new File([TINY_PNG], "scalp.png", { type: "image/png" }));
  fd.append("nail_image", new File([TINY_PNG], "nail.png", { type: "image/png" }));
  const analyze = await fetch(`${BASE}/api/screening/analyze-images`, {
    method: "POST",
    headers: { cookie },
    body: fd,
  });
  const analyzeJson = await analyze.json();
  check(
    "analyze-images multipart",
    analyze.status === 200 && analyzeJson.predictions?.scalp && analyzeJson.predictions?.nails,
    `status ${analyze.status}`
  );

  const scalpPred = analyzeJson.predictions.scalp;
  const nailPred = analyzeJson.predictions.nails;
  const complete = await req("/api/screening/complete", {
    method: "POST",
    body: JSON.stringify({
      screening_type: "combined",
      scalp_prediction: scalpPred,
      nail_prediction: nailPred,
      scalp_image_path: scalpPred.image_path,
      nail_image_path: nailPred.image_path,
      city: "Chennai",
      symptoms: {
        itching: "yes",
        itching_severity: 6,
        scaling: 4,
        hair_fall: 7,
        patchy_hair_loss: false,
        duration: "1-3_months",
        trend: "same",
        severity_level: "moderate",
        water_intake: "1-1.5L",
        diet_overall: "irregular",
      },
      explainability: true,
    }),
  });
  const sId = complete.data?.screening?.id;
  check(
    "complete screening + PDF",
    complete.status === 200 && sId && Boolean(complete.data.screening.report_path),
    `id ${sId} report ${complete.data?.screening?.report_path}`
  );

  const uploadFile = await fetch(`${BASE}/api/uploads/${scalpPred.image_path}`, { headers: { cookie } });
  check("upload file served", uploadFile.status === 200 && !!(uploadFile.headers.get("content-type") || "").includes("image"));

  const dash = await req("/api/dashboard");
  check("dashboard stats", dash.status === 200 && dash.data.stats?.total === 1, JSON.stringify(dash.data?.stats));

  const hist = await req("/api/history");
  check("history list", hist.status === 200 && hist.data.screenings.length === 1);

  const detail = await req(`/api/history/${sId}`);
  check("history detail", detail.status === 200 && detail.data.screening?.id === sId);

  const pdfRes = await fetch(`${BASE}/api/reports/${sId}/pdf`, { headers: { cookie } });
  const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
  check("pdf download", pdfRes.status === 200 && pdfBuf.subarray(0, 4).toString() === "%PDF", `bytes ${pdfBuf.length}`);

  // ------------------------------------------------------------ chat
  const chat = await req("/api/chat/message", {
    method: "POST",
    body: JSON.stringify({ message: "my latest screening" }),
  });
  check("chat reply contains context", chat.status === 200 && chat.data.reply.includes("Overall severity"));
  const chatHist = await req("/api/chat/history");
  check("chat history", chatHist.status === 200 && chatHist.data.messages.length === 2);

  // ------------------------------------------------------------ reminders
  const rem = await req("/api/reminders", {
    method: "POST",
    body: JSON.stringify({
      title: "Apply moisturiser",
      description: "Nightly routine",
      reminder_time: "21:30",
      repeat_frequency: "daily",
      is_enabled: true,
    }),
  });
  const remId = rem.data?.reminder?.id;
  check("reminder create", rem.status === 201 && remId);

  const remBad = await req("/api/reminders", {
    method: "POST",
    body: JSON.stringify({ title: "", reminder_time: "99:99" }),
  });
  check("reminder validation", remBad.status === 400 && Boolean(remBad.data.fields));

  const remUpd = await req(`/api/reminders/${remId}`, {
    method: "PUT",
    body: JSON.stringify({ is_enabled: false }),
  });
  check("reminder toggle", remUpd.status === 200 && remUpd.data.reminder.is_enabled === false);

  const remList = await req("/api/reminders");
  check("reminder list", remList.status === 200 && remList.data.reminders.length === 1);

  const remDel = await req(`/api/reminders/${remId}`, { method: "DELETE" });
  check("reminder delete", remDel.status === 200);

  // ------------------------------------------------------------ doctors
  const docs = await req("/api/doctors?city=Chennai&screening_area=combined&severity=high");
  check(
    "doctors list",
    docs.status === 200 && docs.data.doctors.length > 0 && Boolean(docs.data.sample_notice),
    `count ${docs.data.doctors.length}`
  );

  const noAuth = await fetch(`${BASE}/api/doctors`);
  check("protected route 401 without cookie", noAuth.status === 401);

  // ------------------------------------------------------------ admin
  const adminLogin = await req("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@dermai.app", password: "Admin@1234" }),
  });
  check("admin login", adminLogin.status === 200);

  const stats = await req("/api/admin/stats");
  check("admin stats", stats.status === 200 && stats.data.total_users >= 3 && stats.data.total_screenings >= 1);

  const users = await req("/api/admin/users");
  check(
    "admin users w/ count",
    users.status === 200 && users.data.users[0].screening_count !== undefined
  );

  const docCreate = await req("/api/admin/doctors", {
    method: "POST",
    body: JSON.stringify({ name: "Dr. Smoke Test", city: "Chennai", is_sample: true }),
  });
  const docId = docCreate.data?.doctor?.id;
  check("admin doctor create", docCreate.status === 201 && docId);
  const docDel = await req(`/api/admin/doctors/${docId}`, { method: "DELETE" });
  check("admin doctor delete", docDel.status === 200);

  const conds = await req("/api/admin/conditions");
  check("admin conditions list", conds.status === 200 && conds.data.conditions.length >= 1);

  const nutr = await req("/api/admin/nutrition");
  check("admin nutrition list", nutr.status === 200 && nutr.data.nutrition.length >= 1);

  const recs = await req("/api/admin/recommendations");
  check("admin recommendations list", recs.status === 200 && recs.data.recommendations.length >= 1);

  const nonAdmin = await fetch(`${BASE}/api/admin/stats`, { headers: { cookie: userCookie } });
  check("admin blocked for normal user", nonAdmin.status === 403, `status ${nonAdmin.status}`);

  // ------------------------------------------------------------ history ops
  const cmpA = sId;
  const hist2 = await req("/api/screening/complete", {
    method: "POST",
    body: JSON.stringify({
      screening_type: "scalp",
      scalp_prediction: scalpPred,
      scalp_image_path: scalpPred.image_path,
      city: "",
      symptoms: { duration: "less_than_week", itching: "no", hair_fall: 2 },
    }),
  });
  const cmpB = hist2.data?.screening?.id;
  check("second screening", hist2.status === 200 && cmpB);

  const cmp = await req(`/api/history/compare/${cmpA}/${cmpB}`);
  check("compare", cmp.status === 200 && cmp.data.previous && cmp.data.current);

  const del = await req(`/api/history/${cmpB}`, { method: "DELETE" });
  check("delete screening", del.status === 200);
  const del404 = await req(`/api/history/${cmpB}`);
  check("deleted screening 404", del404.status === 404);

  const logout = await req("/api/auth/logout", { method: "POST" });
  check("logout", logout.status === 200);
  cookie = "";
  const afterLogout = await fetch(`${BASE}/api/auth/me`);
  check("me 401 after logout", afterLogout.status === 401);

  const demo = await req("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "demo@dermai.app", password: "Demo@1234" }),
  });
  check("demo seed login", demo.status === 200 && demo.data.user?.role === "user");

  const adminDenied = await req("/api/admin/stats");
  check("demo user blocked from admin", adminDenied.status === 403);

  const failed = results.filter((r) => !r.passes).length;
  const total = results.length;
  console.log(`\n${total - failed}/${total} checks passed`);
  process.exitCode = failed === 0 ? 0 : 1;
}

(async () => {
  try {
    await run();
  } catch (e) {
    console.error("FATAL:", e.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.kill();
      await new Promise((res) => setTimeout(res, 500));
    }
    process.exit(process.exitCode ?? 0);
  }
})();