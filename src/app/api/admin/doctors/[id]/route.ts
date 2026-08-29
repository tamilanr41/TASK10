import { NextRequest } from "next/server";
import db, { DoctorRow, doctorToDict } from "@/lib/db";
import { json, jsonError, requireAdmin, isError, readJson } from "@/lib/http";

type Ctx = { params: { id: string } };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const doc = db.prepare("SELECT * FROM doctors WHERE id = ?").get(ctx.params.id) as
    | DoctorRow
    | undefined;
  if (!doc) return jsonError("Doctor not found.", 404);

  const data = await readJson(req);
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const f of ["name", "specialization", "clinic", "location", "contact", "availability", "consultation_info", "city"]) {
    if (f in data) {
      sets.push(`${f} = ?`);
      vals.push(String(data[f] ?? "").trim());
    }
  }
  if ("is_sample" in data) {
    sets.push("is_sample = ?");
    vals.push(data.is_sample ? 1 : 0);
  }
  if (sets.length) {
    db.prepare(`UPDATE doctors SET ${sets.join(", ")} WHERE id = ?`).run(...vals, ctx.params.id);
  }

  const updated = db.prepare("SELECT * FROM doctors WHERE id = ?").get(ctx.params.id) as DoctorRow;
  return json({ message: "Doctor updated.", doctor: doctorToDict(updated) });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const doc = db.prepare("SELECT * FROM doctors WHERE id = ?").get(ctx.params.id) as
    | DoctorRow
    | undefined;
  if (!doc) return jsonError("Doctor not found.", 404);

  db.prepare("DELETE FROM doctors WHERE id = ?").run(ctx.params.id);
  return json({ message: "Doctor deleted." });
}