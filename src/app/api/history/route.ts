import { getUserById, listScreeningsByUser, screeningToDict } from "@/lib/db";
import { json, jsonError, requireAuth, isError } from "@/lib/http";

export async function GET() {
  const session = await requireAuth();
  if (isError(session)) return session;

  const user = await getUserById(session.userId);
  if (!user) return jsonError("User not found.", 404);

  const screenings = await listScreeningsByUser(session.userId);

  return json({ screenings: screenings.map(screeningToDict) });
}