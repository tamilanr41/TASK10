import { NextRequest } from "next/server";
import db, { DoctorRow, doctorToDict } from "@/lib/db";
import { json, jsonError, requireAdmin, isError, readJson } from "@/lib/http";

const FIELDS = [
  "name",
  "specialization",
  "clinic",
  "location",
  "contact",
  "availability",
  "consultation_info",
  "city",
] as const;

export async function GET() {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;
  const rows = db.prepare("SELECT * FROM doctors ORDER BY created_at ASC").all() as DoctorRow[];
  return json({ doctors: rows.map(doctorToDict) });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const data = await readJson(req);
  const name = String(data.name || "").trim();
  if (!name) return jsonError("Doctor name is required.", 400);

  const info = db
    .prepare(
      `INSERT INTO doctors (name, specialization, clinic, location, contact, availability, consultation_info, city, is_sample)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      name,
      String(data.specialization || "Dermatology").trim(),
      String(data.clinic || "").trim(),
      String(data.location || "").trim(),
      String(data.contact || "").trim(),
      String(data.availability || "").trim(),
      String(data.consultation_info || "").trim(),
      String(data.city || "").trim(),
      data.is_sample === undefined ? 1 : data.is_sample ? 1 : 0
    );

  const row = db.prepare("SELECT * FROM doctors WHERE id = ?").get(info.lastInsertRowid) as DoctorRow;
  return json({ message: "Doctor added.", doctor: doctorToDict(row) }, 201);
}