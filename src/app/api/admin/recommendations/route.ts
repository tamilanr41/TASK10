import { NextRequest } from "next/server";
import db, { RecommendationRow } from "@/lib/db";
import { json, jsonError, requireAdmin, isError, readJson } from "@/lib/http";

function toDict(r: RecommendationRow): Record<string, unknown> {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    description: r.description,
    severity: r.severity,
    is_active: !!r.is_active,
  };
}

export async function GET() {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;
  const rows = db
    .prepare("SELECT * FROM recommendations ORDER BY created_at ASC")
    .all() as RecommendationRow[];
  return json({ recommendations: rows.map(toDict) });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const data = await readJson(req);
  const title = String(data.title || "").trim();
  if (!title) return jsonError("Recommendation title is required.", 400);

  const info = db
    .prepare(
      `INSERT INTO recommendations (title, category, description, severity, is_active)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      title,
      String(data.category || "precaution").trim(),
      String(data.description || "").trim(),
      String(data.severity || "all").trim(),
      data.is_active === undefined ? 1 : data.is_active ? 1 : 0
    );

  const row = db
    .prepare("SELECT * FROM recommendations WHERE id = ?")
    .get(info.lastInsertRowid) as RecommendationRow;
  return json({ message: "Recommendation added.", recommendation: toDict(row) }, 201);
}