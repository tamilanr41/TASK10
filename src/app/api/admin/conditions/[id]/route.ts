import { NextRequest } from "next/server";
import db, { ConditionRow } from "@/lib/db";
import { json, jsonError, requireAdmin, isError, readJson } from "@/lib/http";

type Ctx = { params: { id: string } };

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

export async function PUT(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const cond = db.prepare("SELECT * FROM conditions WHERE id = ?").get(ctx.params.id) as
    | ConditionRow
    | undefined;
  if (!cond) return jsonError("Condition not found.", 404);

  const data = await readJson(req);
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const f of ["name", "category", "description", "severity_guidance", "general_recommendations"]) {
    if (f in data && data[f] !== null) {
      sets.push(`${f} = ?`);
      vals.push(String(data[f]));
    }
  }
  if (sets.length) {
    db.prepare(`UPDATE conditions SET ${sets.join(", ")} WHERE id = ?`).run(...vals, ctx.params.id);
  }

  const updated = db.prepare("SELECT * FROM conditions WHERE id = ?").get(ctx.params.id) as ConditionRow;
  return json({ message: "Condition updated.", condition: toDict(updated) });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const cond = db.prepare("SELECT * FROM conditions WHERE id = ?").get(ctx.params.id) as
    | ConditionRow
    | undefined;
  if (!cond) return jsonError("Condition not found.", 404);

  db.prepare("DELETE FROM conditions WHERE id = ?").run(ctx.params.id);
  return json({ message: "Condition deleted." });
}