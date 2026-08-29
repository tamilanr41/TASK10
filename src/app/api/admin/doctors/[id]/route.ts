import { NextRequest } from "next/server";
import { getDoctorById, updateDoctorById, deleteDoctorById, doctorToDict } from "@/lib/db";
import { json, jsonError, requireAdmin, isError, readJson } from "@/lib/http";

type Ctx = { params: { id: string } };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const doc = await getDoctorById(Number(ctx.params.id));
  if (!doc) return jsonError("Doctor not found.", 404);

  const data = await readJson(req);
  const fields: Record<string, unknown> = {};
  for (const f of ["name", "specialization", "clinic", "location", "contact", "availability", "consultation_info", "city"]) {
    if (f in data) fields[f] = String(data[f] ?? "").trim();
  }
  if ("is_sample" in data) fields.is_sample = data.is_sample ? 1 : 0;
  if (Object.keys(fields).length) await updateDoctorById(Number(ctx.params.id), fields);

  const updated = await getDoctorById(Number(ctx.params.id));
  return json({ message: "Doctor updated.", doctor: updated ? doctorToDict(updated) : null });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const doc = await getDoctorById(Number(ctx.params.id));
  if (!doc) return jsonError("Doctor not found.", 404);

  await deleteDoctorById(Number(ctx.params.id));
  return json({ message: "Doctor deleted." });
}