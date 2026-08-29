import { NextRequest } from "next/server";
import db, { RecommendationRow } from "@/lib/db";
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

  const r = db.prepare("SELECT * FROM recommendations WHERE id = ?").get(ctx.params.id) as
    | RecommendationRow
    | undefined;
  if (!r) return jsonError("Recommendation not found.", 404);

  const data = await readJson(req);
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const f of ["title", "category", "description", "severity"]) {
    if (f in data) {
      sets.push(`${f} = ?`);
      vals.push(String(data[f] ?? "").trim());
    }
  }
  if ("is_active" in data) {
    sets.push("is_active = ?");
    vals.push(data.is_active ? 1 : 0);
  }
  if (sets.length) {
    db.prepare(`UPDATE recommendations SET ${sets.join(", ")} WHERE id = ?`).run(
      ...vals,
      ctx.params.id
    );
  }

  const updated = db
    .prepare("SELECT * FROM recommendations WHERE id = ?")
    .get(ctx.params.id) as RecommendationRow;
  return json({ message: "Recommendation updated.", recommendation: toDict(updated) });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const r = db.prepare("SELECT * FROM recommendations WHERE id = ?").get(ctx.params.id) as
    | RecommendationRow
    | undefined;
  if (!r) return jsonError("Recommendation not found.", 404);

  db.prepare("DELETE FROM recommendations WHERE id = ?").run(ctx.params.id);
  return json({ message: "Recommendation deleted." });
}