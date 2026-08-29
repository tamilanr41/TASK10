import db, { screeningToDict, ScreeningRow, UserRow } from "@/lib/db";
import { json, jsonError, requireAuth, isError } from "@/lib/http";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, ctx: Ctx) {
  const session = await requireAuth();
  if (isError(session)) return session;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.userId) as
    | UserRow
    | undefined;
  const screening = db.prepare("SELECT * FROM screenings WHERE id = ?").get(ctx.params.id) as
    | ScreeningRow
    | undefined;

  if (!screening) return jsonError("Screening not found.", 404);
  if (screening.user_id !== user?.id && user?.role !== "admin") {
    return jsonError("You can only view your own screenings.", 403);
  }
  return json({ screening: screeningToDict(screening) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await requireAuth();
  if (isError(session)) return session;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.userId) as
    | UserRow
    | undefined;
  const screening = db.prepare("SELECT * FROM screenings WHERE id = ?").get(ctx.params.id) as
    | ScreeningRow
    | undefined;

  if (!screening) return jsonError("Screening not found.", 404);
  if (screening.user_id !== user?.id && user?.role !== "admin") {
    return jsonError("You can only delete your own screenings.", 403);
  }
  db.prepare("DELETE FROM screenings WHERE id = ?").run(ctx.params.id);
  return json({ message: "Screening deleted." });
}