import { listDoctors, doctorToDict, DoctorRow } from "@/lib/db";
import { json, requireAuth, isError } from "@/lib/http";
import { filterDoctors } from "@/lib/ai/doctorMatcher";

export async function GET(req: Request) {
  const session = await requireAuth();
  if (isError(session)) return session;

  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") || "";
  const area = searchParams.get("screening_area") || "";
  const severity = searchParams.get("severity") || "moderate";

  const doctors = await listDoctors();
  const matched = filterDoctors({ city, screening_area: area, severity }, doctors);
  const payload = matched.map((d) => doctorToDict(d as unknown as DoctorRow));

  return json({
    doctors: payload,
    sample_notice: payload.some((d) => d.is_sample)
      ? "The doctor records shown are sample/placeholder entries used for the college prototype and are not verified real-world data."
      : null,
  });
}