import { NextRequest } from "next/server";
import db, { ConditionRow } from "@/lib/db";
import { json, jsonError, requireAdmin, isError, readJson } from "@/lib/http";

function toDict(c: ConditionRow): Record<string, unknown> {
  return {
    id: c.id,
    name: c.name,
    category: c.category,
    description: c.description,
    severity_guidance: c.severity_guidance,
    general_recommendations: c.general_recommendations,
  };
}

export async function GET() {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;
  const rows = db.prepare("SELECT * FROM conditions ORDER BY created_at ASC").all() as ConditionRow[];
  return json({ conditions: rows.map(toDict) });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const data = await readJson(req);
  const name = String(data.name || "").trim();
  if (!name) return jsonError("Condition name is required.", 400);

  const info = db
    .prepare(
      `INSERT INTO conditions (name, category, description, severity_guidance, general_recommendations)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      name,
      String(data.category || "general").trim(),
      String(data.description || "").trim(),
      String(data.severity_guidance || "").trim(),
      String(data.general_recommendations || "").trim()
    );

  const row = db.prepare("SELECT * FROM conditions WHERE id = ?").get(info.lastInsertRowid) as ConditionRow;
  return json({ message: "Condition added.", condition: toDict(row) }, 201);
}