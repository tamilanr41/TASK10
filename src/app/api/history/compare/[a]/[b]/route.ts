import { getUserById, getScreeningById, ScreeningRow } from "@/lib/db";
import { json, jsonError, requireAuth, isError } from "@/lib/http";

type Ctx = { params: { a: string; b: string } };

export async function GET(_req: Request, ctx: Ctx) {
  const session = await requireAuth();
  if (isError(session)) return session;

  const user = await getUserById(session.userId);

  const sa = await getScreeningById(Number(ctx.params.a));
  const sb = await getScreeningById(Number(ctx.params.b));

  for (const s of [sa, sb]) {
    if (!s) return jsonError("One of the screenings was not found.", 404);
    if (s.user_id !== user?.id && user?.role !== "admin") {
      return jsonError("You can only compare your own screenings.", 403);
    }
  }

  const brief = (s: ScreeningRow) => ({
    id: s.id,
    date: s.created_at,
    screening_type: s.screening_type,
    overall_condition: s.overall_condition,
    overall_confidence: s.overall_confidence,
    overall_severity: s.overall_severity,
    mode: s.mode,
  });

  return json({
    previous: brief(sa!),
    current: brief(sb!),
    note:
      "Changes in AI-estimated scores do NOT establish clinical " +
      "improvement or worsening. Use this comparison as a general " +
      "observation only and consult a professional for real progress " +
      "assessment.",
  });
}