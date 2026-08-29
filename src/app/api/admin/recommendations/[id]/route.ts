import { NextRequest } from "next/server";
import { getRecommendationById, updateRecommendationById, deleteRecommendationById, RecommendationRow } from "@/lib/db";
import { json, jsonError, requireAdmin, isError, readJson } from "@/lib/http";

type Ctx = { params: { id: string } };

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

export async function PUT(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const r = await getRecommendationById(Number(ctx.params.id));
  if (!r) return jsonError("Recommendation not found.", 404);

  const data = await readJson(req);
  const fields: Record<string, unknown> = {};
  for (const f of ["title", "category", "description", "severity"]) {
    if (f in data) fields[f] = String(data[f] ?? "").trim();
  }
  if ("is_active" in data) {
    fields.is_active = data.is_active ? 1 : 0;
  }
  if (Object.keys(fields).length) await updateRecommendationById(Number(ctx.params.id), fields);

  const updated = await getRecommendationById(Number(ctx.params.id));
  return json({ message: "Recommendation updated.", recommendation: updated ? toDict(updated) : null });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const r = await getRecommendationById(Number(ctx.params.id));
  if (!r) return jsonError("Recommendation not found.", 404);

  await deleteRecommendationById(Number(ctx.params.id));
  return json({ message: "Recommendation deleted." });
}