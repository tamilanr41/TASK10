import db, { screeningToDict, ScreeningRow, UserRow } from "@/lib/db";
import { json, jsonError, requireAuth, isError } from "@/lib/http";

export async function GET() {
  const session = await requireAuth();
  if (isError(session)) return session;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.userId) as
    | UserRow
    | undefined;
  if (!user) return jsonError("User not found.", 404);

  const screenings = db
    .prepare("SELECT * FROM screenings WHERE user_id = ? ORDER BY created_at DESC")
    .all(session.userId) as ScreeningRow[];

  return json({ screenings: screenings.map(screeningToDict) });
}