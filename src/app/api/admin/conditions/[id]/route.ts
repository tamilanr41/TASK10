import { NextRequest } from "next/server";
import { getConditionById, updateConditionById, deleteConditionById, ConditionRow } from "@/lib/db";
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

  const cond = await getConditionById(Number(ctx.params.id));
  if (!cond) return jsonError("Condition not found.", 404);

  const data = await readJson(req);
  const fields: Record<string, unknown> = {};
  for (const f of ["name", "category", "description", "severity_guidance", "general_recommendations"]) {
    if (f in data && data[f] !== null) fields[f] = String(data[f]);
  }
  if (Object.keys(fields).length) await updateConditionById(Number(ctx.params.id), fields);

  const updated = await getConditionById(Number(ctx.params.id));
  return json({ message: "Condition updated.", condition: updated ? toDict(updated) : null });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const cond = await getConditionById(Number(ctx.params.id));
  if (!cond) return jsonError("Condition not found.", 404);

  await deleteConditionById(Number(ctx.params.id));
  return json({ message: "Condition deleted." });
}