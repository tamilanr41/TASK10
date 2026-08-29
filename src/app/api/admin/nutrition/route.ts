import { NextRequest } from "next/server";
import db, { NutritionRow } from "@/lib/db";
import { json, jsonError, requireAdmin, isError, readJson } from "@/lib/http";
import { loadJson } from "@/lib/db";

function toDict(n: NutritionRow): Record<string, unknown> {
  return {
    id: n.id,
    nutrient: n.nutrient,
    insight: n.insight,
    food_suggestions: loadJson<string[]>(n.food_suggestions),
    caution_text: n.caution_text,
    is_active: !!n.is_active,
  };
}

export async function GET() {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;
  const rows = db.prepare("SELECT * FROM nutrition ORDER BY created_at ASC").all() as NutritionRow[];
  return json({ nutrition: rows.map(toDict) });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const data = await readJson(req);
  const nutrient = String(data.nutrient || "").trim();
  if (!nutrient) return jsonError("Nutrient name is required.", 400);

  const foods = data.food_suggestions;
  const info = db
    .prepare(
      `INSERT INTO nutrition (nutrient, insight, food_suggestions, caution_text, is_active)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      nutrient,
      String(data.insight || "").trim(),
      foods ? JSON.stringify(foods) : null,
      String(data.caution_text || "").trim(),
      data.is_active === undefined ? 1 : data.is_active ? 1 : 0
    );

  const row = db.prepare("SELECT * FROM nutrition WHERE id = ?").get(info.lastInsertRowid) as NutritionRow;
  return json({ message: "Nutrition insight added.", nutrition: toDict(row) }, 201);
}