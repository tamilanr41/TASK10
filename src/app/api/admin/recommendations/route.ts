import { NextRequest } from "next/server";
import { listRecommendations, insertRecommendation, RecommendationRow } from "@/lib/db";
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
  const rows = await listRecommendations();
  return json({ recommendations: rows.map(toDict) });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const data = await readJson(req);
  const title = String(data.title || "").trim();
  if (!title) return jsonError("Recommendation title is required.", 400);

  const row = await insertRecommendation({
    title,
    category: String(data.category || "precaution").trim(),
    description: String(data.description || "").trim(),
    severity: String(data.severity || "all").trim(),
    is_active: data.is_active === undefined ? 1 : data.is_active ? 1 : 0,
  });
  return json({ message: "Recommendation added.", recommendation: toDict(row) }, 201);
}