import { NextRequest } from "next/server";
import db, { userToDict, UserRow } from "@/lib/db";
import { json, jsonError, requireAdmin, isError, readJson } from "@/lib/http";

type Ctx = { params: { id: string } };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(ctx.params.id) as
    | UserRow
    | undefined;
  if (!user) return jsonError("User not found.", 404);
  if (user.id === admin.userId) {
    return jsonError("You cannot disable your own account.", 400);
  }

  const data = await readJson(req);
  const isActive = data.is_active === undefined ? !user.is_active : !!data.is_active;
  db.prepare("UPDATE users SET is_active = ? WHERE id = ?").run(isActive ? 1 : 0, user.id);

  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id) as UserRow;
  return json({ message: "User status updated.", user: userToDict(updated) });
}