import { NextRequest } from "next/server";
import db, { NutritionRow } from "@/lib/db";
import { json, jsonError, requireAdmin, isError, readJson } from "@/lib/http";
import { loadJson } from "@/lib/db";

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

  const n = db.prepare("SELECT * FROM nutrition WHERE id = ?").get(ctx.params.id) as
    | NutritionRow
    | undefined;
  if (!n) return jsonError("Nutrition entry not found.", 404);

  const data = await readJson(req);
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const f of ["nutrient", "insight", "caution_text"]) {
    if (f in data) {
      sets.push(`${f} = ?`);
      vals.push(String(data[f] ?? "").trim());
    }
  }
  if ("food_suggestions" in data) {
    sets.push("food_suggestions = ?");
    vals.push(data.food_suggestions ? JSON.stringify(data.food_suggestions) : null);
  }
  if ("is_active" in data) {
    sets.push("is_active = ?");
    vals.push(data.is_active ? 1 : 0);
  }
  if (sets.length) {
    db.prepare(`UPDATE nutrition SET ${sets.join(", ")} WHERE id = ?`).run(...vals, ctx.params.id);
  }

  const updated = db.prepare("SELECT * FROM nutrition WHERE id = ?").get(ctx.params.id) as NutritionRow;
  return json({ message: "Nutrition insight updated.", nutrition: toDict(updated) });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const n = db.prepare("SELECT * FROM nutrition WHERE id = ?").get(ctx.params.id) as
    | NutritionRow
    | undefined;
  if (!n) return jsonError("Nutrition entry not found.", 404);

  db.prepare("DELETE FROM nutrition WHERE id = ?").run(ctx.params.id);
  return json({ message: "Nutrition insight deleted." });
}