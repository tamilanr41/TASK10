import { NextRequest } from "next/server";
import { getUserById, userToDict } from "@/lib/db";
import { json, jsonError, requireAuth, isError } from "@/lib/http";

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (isError(session)) return session;

  const user = await getUserById(session.userId);
  if (!user) return jsonError("User not found.", 404);
  return json({ user: await userToDict(user, true) });
}