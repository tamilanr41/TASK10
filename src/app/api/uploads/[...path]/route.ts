import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { UPLOAD_ROOT } from "@/lib/paths";
import { jsonError } from "@/lib/http";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

type Ctx = { params: { path: string[] } };

export async function GET(req: NextRequest, ctx: Ctx) {
  const segments = ctx.params.path || [];
  if (segments.length === 0) return jsonError("Invalid path.", 400);

  const rel = segments.join(path.sep);
  if (rel.includes("..") || path.isAbsolute(rel)) return jsonError("Invalid path.", 400);

  const abs = path.resolve(UPLOAD_ROOT, rel);
  if (!abs.startsWith(path.resolve(UPLOAD_ROOT))) return jsonError("Invalid path.", 400);
  if (!fs.existsSync(abs)) return jsonError("File not found.", 404);

  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).toLowerCase();
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    },
  });
}