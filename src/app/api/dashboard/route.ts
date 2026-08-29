import { getUserById, listScreeningsByUser, screeningToDict, userToDict } from "@/lib/db";
import { json, jsonError, requireAuth, isError } from "@/lib/http";

export async function GET() {
  const session = await requireAuth();
  if (isError(session)) return session;

  const user = await getUserById(session.userId);
  if (!user) return jsonError("User not found.", 404);

  const screenings = await listScreeningsByUser(session.userId);

  const total = screenings.length;
  const low = screenings.filter((s) => s.overall_severity === "low").length;
  const moderate = screenings.filter((s) => s.overall_severity === "moderate").length;
  const high = screenings.filter((s) => s.overall_severity === "high").length;
  const scalpCount = screenings.filter((s) => s.screening_type === "scalp" || s.screening_type === "combined").length;
  const nailCount = screenings.filter((s) => s.screening_type === "nails" || s.screening_type === "combined").length;
  const recent = screenings.slice(0, 5).map(screeningToDict);
  const latest = screenings[0] ? screeningToDict(screenings[0]) : null;

  return json({
    user: await userToDict(user),
    stats: {
      total,
      scalp: scalpCount,
      nails: nailCount,
      low,
      moderate,
      high,
    },
    recent,
    latest,
  });
}