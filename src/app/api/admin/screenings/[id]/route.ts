import { NextRequest } from "next/server";
import { getScreeningById, getUserWithScreening, deleteScreeningById, screeningToDict } from "@/lib/db";
import { json, jsonError, requireAdmin, isError } from "@/lib/http";

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const row = await getUserWithScreening(Number(ctx.params.id));
  if (!row) return jsonError("Screening not found.", 404);

  return json({
    screening: { ...screeningToDict(row), user_name: row.user_name, user_email: row.user_email },
  });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const row = await getScreeningById(Number(ctx.params.id));
  if (!row) return jsonError("Screening not found.", 404);

  await deleteScreeningById(row.id);
  return json({ message: "Screening deleted." });
}