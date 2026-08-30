import { NextRequest } from "next/server";
import { getUserById, getUserByEmail, updateUser, deleteUserAndData, userToDict } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { json, jsonError, requireAdmin, isError, readJson } from "@/lib/http";

type Ctx = { params: { id: string } };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const user = await getUserById(Number(ctx.params.id));
  if (!user) return jsonError("User not found.", 404);

  const data = await readJson(req);

  const errors: Record<string, string> = {};

  const name = String(data.name ?? "").trim();
  if (!name) errors.name = "Full name is required.";
  else if (name.length < 2) errors.name = "Full name must be at least 2 characters.";

  const email = String(data.email ?? "").trim().toLowerCase();
  if (!email) errors.email = "Email is required.";
  else if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email))
    errors.email = "Please enter a valid email address.";
  else if (email !== user.email) {
    const dup = await getUserByEmail(email);
    if (dup && dup.id !== user.id) errors.email = "This email is already in use.";
  }

  const role = String(data.role ?? user.role).trim().toLowerCase();
  if (!["user", "doctor", "admin"].includes(role)) errors.role = "Invalid role.";
  else if (user.id === admin.userId && role !== "admin")
    errors.role = "You cannot remove your own admin role.";

  const password = String(data.password || "");

  if (password) {
    if (password.length < 8) errors.password = "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(password)) errors.password = "Password must contain at least one uppercase letter.";
    if (!/[0-9]/.test(password)) errors.password = "Password must contain at least one number.";
  }

  const age = data.age;
  if (age !== undefined && age !== null && age !== "") {
    const n = Number(age);
    if (Number.isNaN(n) || !Number.isInteger(n) || n < 1 || n > 120)
      errors.age = "Age must be between 1 and 120.";
  }

  const sex = String(data.sex || "").trim().toLowerCase();
  if (sex && !["male", "female", "other", "prefer not to say"].includes(sex))
    errors.sex = "Please select a valid option for sex.";

  if (Object.keys(errors).length) return jsonError("Validation failed", 400, { fields: errors });

  await updateUser(user.id, {
    name,
    email,
    role,
    age: age !== undefined && age !== null && age !== "" ? Number(age) : user.age,
    sex: sex || user.sex,
    password_hash: password ? hashPassword(password) : undefined,
  });

  const updated = await getUserById(user.id);
  return json({ message: "User updated successfully.", user: updated ? await userToDict(updated, true) : null });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const user = await getUserById(Number(ctx.params.id));
  if (!user) return jsonError("User not found.", 404);
  if (user.id === admin.userId) return jsonError("You cannot delete your own account.", 400);

  await deleteUserAndData(user.id);
  return json({ message: "User deleted with all their data." });
}