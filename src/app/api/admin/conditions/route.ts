import { NextRequest } from "next/server";
import { listConditions, insertCondition, ConditionRow } from "@/lib/db";
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
  const rows = await listConditions();
  return json({ conditions: rows.map(toDict) });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const data = await readJson(req);
  const name = String(data.name || "").trim();
  if (!name) return jsonError("Condition name is required.", 400);

  const row = await insertCondition({
    name,
    category: String(data.category || "general").trim(),
    description: String(data.description || "").trim(),
    severity_guidance: String(data.severity_guidance || "").trim(),
    general_recommendations: String(data.general_recommendations || "").trim(),
  });
  return json({ message: "Condition added.", condition: toDict(row) }, 201);
}