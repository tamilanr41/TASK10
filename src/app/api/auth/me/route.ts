import { NextRequest } from "next/server";
import db, { userToDict, UserRow } from "@/lib/db";
import { json, jsonError, requireAuth, isError } from "@/lib/http";

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (isError(session)) return session;

  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(session.userId) as UserRow | undefined;
  if (!user) return jsonError("User not found.", 404);
  return json({ user: userToDict(user, true) });
}