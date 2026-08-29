import { NextRequest } from "next/server";
import { listNutrition, insertNutrition, loadJson, NutritionRow } from "@/lib/db";
import { json, jsonError, requireAdmin, isError, readJson } from "@/lib/http";

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
  const rows = await listNutrition();
  return json({ nutrition: rows.map(toDict) });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const data = await readJson(req);
  const nutrient = String(data.nutrient || "").trim();
  if (!nutrient) return jsonError("Nutrient name is required.", 400);

  const foods = data.food_suggestions;
  const row = await insertNutrition({
    nutrient,
    insight: String(data.insight || "").trim(),
    food_suggestions: foods ? JSON.stringify(foods) : null,
    caution_text: String(data.caution_text || "").trim(),
    is_active: data.is_active === undefined ? 1 : data.is_active ? 1 : 0,
  });
  return json({ message: "Nutrition insight added.", nutrition: toDict(row) }, 201);
}