import { NextRequest } from "next/server";
import { getNutritionById, updateNutritionById, deleteNutritionById, loadJson, NutritionRow } from "@/lib/db";
import { json, jsonError, requireAdmin, isError, readJson } from "@/lib/http";

type Ctx = { params: { id: string } };

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

export async function PUT(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const n = await getNutritionById(Number(ctx.params.id));
  if (!n) return jsonError("Nutrition entry not found.", 404);

  const data = await readJson(req);
  const fields: Record<string, unknown> = {};
  for (const f of ["nutrient", "insight", "caution_text"]) {
    if (f in data) fields[f] = String(data[f] ?? "").trim();
  }
  if ("food_suggestions" in data) {
    fields.food_suggestions = data.food_suggestions ? JSON.stringify(data.food_suggestions) : null;
  }
  if ("is_active" in data) {
    fields.is_active = data.is_active ? 1 : 0;
  }
  if (Object.keys(fields).length) await updateNutritionById(Number(ctx.params.id), fields);

  const updated = await getNutritionById(Number(ctx.params.id));
  return json({ message: "Nutrition insight updated.", nutrition: updated ? toDict(updated) : null });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const n = await getNutritionById(Number(ctx.params.id));
  if (!n) return jsonError("Nutrition entry not found.", 404);

  await deleteNutritionById(Number(ctx.params.id));
  return json({ message: "Nutrition insight deleted." });
}