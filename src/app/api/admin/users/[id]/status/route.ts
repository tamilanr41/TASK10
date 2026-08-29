import { NextRequest } from "next/server";
import { getUserById, updateUserActive, userToDict } from "@/lib/db";
import { json, jsonError, requireAdmin, isError, readJson } from "@/lib/http";

type Ctx = { params: { id: string } };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const user = await getUserById(Number(ctx.params.id));
  if (!user) return jsonError("User not found.", 404);
  if (user.id === admin.userId) {
    return jsonError("You cannot disable your own account.", 400);
  }

  const data = await readJson(req);
  const isActive = data.is_active === undefined ? !user.is_active : !!data.is_active;
  await updateUserActive(user.id, isActive);

  const updated = await getUserById(user.id);
  return json({ message: "User status updated.", user: updated ? await userToDict(updated) : null });
}