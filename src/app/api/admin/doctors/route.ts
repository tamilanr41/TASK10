import { NextRequest } from "next/server";
import { listDoctors, insertDoctor, doctorToDict } from "@/lib/db";
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
  const rows = await listDoctors();
  return json({ doctors: rows.map(doctorToDict) });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const data = await readJson(req);
  const name = String(data.name || "").trim();
  if (!name) return jsonError("Doctor name is required.", 400);

  const row = await insertDoctor({
    name,
    specialization: String(data.specialization || "Dermatology").trim(),
    clinic: String(data.clinic || "").trim(),
    location: String(data.location || "").trim(),
    contact: String(data.contact || "").trim(),
    availability: String(data.availability || "").trim(),
    consultation_info: String(data.consultation_info || "").trim(),
    city: String(data.city || "").trim(),
    is_sample: data.is_sample === undefined ? 1 : data.is_sample ? 1 : 0,
  });
  return json({ message: "Doctor added.", doctor: doctorToDict(row) }, 201);
}