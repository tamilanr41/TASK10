import express from "express";
import type { Request as ExRequest, Response as ExResponse } from "express";
import multer from "multer";
import nextPkg from "next";

import { authContext } from "@/lib/auth";
import db from "@/lib/db";

import * as authLogin from "@/app/api/auth/login/route";
import * as authLogout from "@/app/api/auth/logout/route";
import * as authMe from "@/app/api/auth/me/route";
import * as authRegister from "@/app/api/auth/register/route";
import * as adminLogin from "@/app/api/admin/login/route";
import * as adminStats from "@/app/api/admin/stats/route";
import * as adminUsers from "@/app/api/admin/users/route";
import * as adminUserStatus from "@/app/api/admin/users/[id]/status/route";
import * as adminConditions from "@/app/api/admin/conditions/route";
import * as adminConditionId from "@/app/api/admin/conditions/[id]/route";
import * as adminDoctors from "@/app/api/admin/doctors/route";
import * as adminDoctorId from "@/app/api/admin/doctors/[id]/route";
import * as adminNutrition from "@/app/api/admin/nutrition/route";
import * as adminNutritionId from "@/app/api/admin/nutrition/[id]/route";
import * as adminRecommendations from "@/app/api/admin/recommendations/route";
import * as adminRecommendationId from "@/app/api/admin/recommendations/[id]/route";
import * as chatHistory from "@/app/api/chat/history/route";
import * as chatMessage from "@/app/api/chat/message/route";
import * as dashboard from "@/app/api/dashboard/route";
import * as doctors from "@/app/api/doctors/route";
import * as history from "@/app/api/history/route";
import * as historyId from "@/app/api/history/[id]/route";
import * as historyCompare from "@/app/api/history/compare/[a]/[b]/route";
import * as questionnaire from "@/app/api/questionnaire/route";
import * as reminders from "@/app/api/reminders/route";
import * as reminderId from "@/app/api/reminders/[id]/route";
import * as reportPdf from "@/app/api/reports/[id]/pdf/route";
import * as analyzeImages from "@/app/api/screening/analyze-images/route";
import * as screeningComplete from "@/app/api/screening/complete/route";
import * as uploads from "@/app/api/uploads/[...path]/route";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || "0.0.0.0";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: false, limit: "30mb" }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

type Handler = (req: unknown, ctx?: unknown) => Promise<unknown>;
type HandlerCtx = Record<string, unknown>;

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function compatReq(expr: ExRequest): Record<string, unknown> {
  const query = new URLSearchParams();
  const raw = expr.query as Record<string, string | string[] | undefined> | undefined;
  for (const k of Object.keys(raw || {})) {
    const v = raw![k];
    if (Array.isArray(v)) v.forEach((x) => query.append(k, x));
    else if (typeof v === "string") query.append(k, v);
  }
  const body = expr.body && typeof expr.body === "object" ? expr.body : {};
  return {
    url: `${expr.protocol}://${expr.get("host") || "localhost"}${expr.originalUrl}`,
    nextUrl: { searchParams: query },
    json: async () => body,
    formData: async () => {
      const fd = new FormData();
      for (const [k, v] of Object.entries(body)) {
        if (typeof v === "string") fd.set(k, v);
      }
      const files: Express.Multer.File[] = (expr.files as Express.Multer.File[]) || [];
      for (const f of files) {
        const bytes = new Uint8Array(f.buffer.buffer as ArrayBuffer, f.buffer.byteOffset, f.buffer.byteLength);
        fd.set(f.fieldname, new File([bytes], f.originalname, { type: f.mimetype }));
      }
      return fd;
    },
  };
}

function isResponseLike(v: unknown): v is globalThis.Response {
  if (v instanceof globalThis.Response) return true;
  const r = v as { constructor?: { name?: string } } | null;
  return typeof r?.constructor?.name === "string" && r.constructor.name === "NextResponse";
}

async function sendResult(result: unknown, res: ExResponse): Promise<void> {
  if (result == null) {
    res.status(204).end();
    return;
  }
  if (isResponseLike(result)) {
    res.status(result.status || 200);
    const headers = result.headers as Headers;
    let setCookies: string[] = [];
    if (typeof headers.getSetCookie === "function") {
      setCookies = headers.getSetCookie();
    }
    headers.forEach((v, k) => {
      if (k.toLowerCase() !== "set-cookie") res.setHeader(k, v);
    });
    if (setCookies.length) res.setHeader("Set-Cookie", setCookies);
    const buf = Buffer.from(await result.arrayBuffer());
    const ct = (headers.get("content-type") || "").toLowerCase();
    if (ct.includes("application/json")) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(result.status || 200).send(buf as unknown as string);
    } else {
      res.end(buf);
    }
    return;
  }
  console.error("[api] unexpected handler result", result);
  res.status(500).json({ error: "Internal server error." });
}

type RegisterOpts = { multipart?: boolean; params?: (expr: ExRequest) => HandlerCtx };

function runRoute(handler: Handler, expr: ExRequest, res: ExResponse, opts?: RegisterOpts): void {
  const token = parseCookies(expr.headers.cookie || undefined)["dermai_token"];
  const req = compatReq(expr);
  const ctx = opts?.params ? opts.params(expr) : { params: (expr.params || {}) as HandlerCtx };
  authContext.run({ token }, async () => {
    try {
      const result = await handler(req, ctx);
      await sendResult(result, res);
    } catch (e) {
      if (e instanceof multer.MulterError) {
        res.status(400).json({ error: `Upload failed: ${e.message}` });
        return;
      }
      console.error("[api] error", expr.method, expr.originalUrl, e);
      res.status(500).json({ error: "Internal server error." });
    }
  });
}

function reg(
  method: "get" | "post" | "put" | "delete",
  routePath: string,
  handler: Handler,
  opts?: RegisterOpts
): void {
  const mw = opts?.multipart ? [upload.any()] : [];
  app[method](routePath, ...mw, (expr: ExRequest, exprRes: ExResponse) => {
    runRoute(handler, expr, exprRes, opts);
  });
}

function bind(fn: unknown): Handler {
  const f = fn as (r?: unknown, c?: unknown) => Promise<unknown>;
  return async (req, ctx) => f(req, ctx);
}

reg("post", "/api/auth/register", bind(authRegister.POST));
reg("post", "/api/auth/login", bind(authLogin.POST));
reg("post", "/api/auth/logout", bind(authLogout.POST));
reg("get", "/api/auth/me", bind(authMe.GET));

reg("post", "/api/admin/login", bind(adminLogin.POST));
reg("get", "/api/admin/stats", bind(adminStats.GET));
reg("get", "/api/admin/users", bind(adminUsers.GET));
reg("put", "/api/admin/users/:id/status", bind(adminUserStatus.PUT));

reg("get", "/api/admin/conditions", bind(adminConditions.GET));
reg("post", "/api/admin/conditions", bind(adminConditions.POST));
reg("put", "/api/admin/conditions/:id", bind(adminConditionId.PUT));
reg("delete", "/api/admin/conditions/:id", bind(adminConditionId.DELETE));

reg("get", "/api/admin/doctors", bind(adminDoctors.GET));
reg("post", "/api/admin/doctors", bind(adminDoctors.POST));
reg("put", "/api/admin/doctors/:id", bind(adminDoctorId.PUT));
reg("delete", "/api/admin/doctors/:id", bind(adminDoctorId.DELETE));

reg("get", "/api/admin/nutrition", bind(adminNutrition.GET));
reg("post", "/api/admin/nutrition", bind(adminNutrition.POST));
reg("put", "/api/admin/nutrition/:id", bind(adminNutritionId.PUT));
reg("delete", "/api/admin/nutrition/:id", bind(adminNutritionId.DELETE));

reg("get", "/api/admin/recommendations", bind(adminRecommendations.GET));
reg("post", "/api/admin/recommendations", bind(adminRecommendations.POST));
reg("put", "/api/admin/recommendations/:id", bind(adminRecommendationId.PUT));
reg("delete", "/api/admin/recommendations/:id", bind(adminRecommendationId.DELETE));

reg("get", "/api/dashboard", bind(dashboard.GET));
reg("get", "/api/doctors", bind(doctors.GET));

reg("get", "/api/history", bind(history.GET));
reg("get", "/api/history/compare/:a/:b", bind(historyCompare.GET));
reg("get", "/api/history/:id", bind(historyId.GET));
reg("delete", "/api/history/:id", bind(historyId.DELETE));

reg("get", "/api/questionnaire", bind(questionnaire.GET));

reg("get", "/api/chat/history", bind(chatHistory.GET));
reg("post", "/api/chat/message", bind(chatMessage.POST));

reg("get", "/api/reminders", bind(reminders.GET));
reg("post", "/api/reminders", bind(reminders.POST));
reg("put", "/api/reminders/:id", bind(reminderId.PUT));
reg("delete", "/api/reminders/:id", bind(reminderId.DELETE));

reg("get", "/api/reports/:id/pdf", bind(reportPdf.GET));

reg("post", "/api/screening/analyze-images", bind(analyzeImages.POST), { multipart: true });
reg("post", "/api/screening/complete", bind(screeningComplete.POST));

reg("get", "/api/uploads/*", bind(uploads.GET), {
  params: (expr) => ({ params: { path: (expr.params[0] || "").split("/").filter(Boolean) } }),
});

app.all("/api/*", (_req: ExRequest, res: ExResponse) => {
  res.status(404).json({ error: "Not found." });
});

const nextApp = (nextPkg as unknown as (o: Record<string, unknown>) => ReturnType<typeof nextPkg>)({
  dev,
  hostname,
  port,
});

async function main(): Promise<void> {
  await nextApp.prepare();
  const handle = nextApp.getRequestHandler();
  app.use((req: ExRequest, res: ExResponse) => {
    void Promise.resolve(handle(req, res)).catch((err: unknown) => {
      console.error("[next] request error", err);
      if (!res.headersSent) res.status(500).send("Internal server error");
    });
  });
  app.listen(port, hostname, () => {
    console.log(`[dermai] server ready on http://${hostname}:${port} (dev=${dev})`);
  });
}

void main().catch((e) => {
  console.error("[dermai] failed to start", e);
  process.exit(1);
});