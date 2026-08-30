import { NextRequest } from "next/server";
import { listUsers, userToDict, getUserByEmail, insertUser } from "@/lib/db";
import { json, jsonError, requireAdmin, isError, readJson } from "@/lib/http";
import { hashPassword } from "@/lib/auth";
import { validateSignup } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const search = (req.nextUrl.searchParams.get("search") || "").trim().toLowerCase();
  const rows = await listUsers(search || undefined);

  const users = await Promise.all(
    rows.map(async (u) => ({ ...(await userToDict(u, true)) }))
  );

  return json({ users });
}

const ROLES = ["user", "doctor", "admin"];

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const data = await readJson(req);
  const { errors, clean } = validateSignup(data);
  if (errors && Object.keys(errors).length)
    return jsonError("Validation failed", 400, { fields: errors });

  const role = String(data.role || "user").trim().toLowerCase();
  if (!ROLES.includes(role)) return jsonError("Invalid role.", 400);

  const existing = await getUserByEmail(clean!.email as string);
  if (existing) return jsonError("This email is already registered.", 409);

  const user = await insertUser({
    name: clean!.name as string,
    email: clean!.email as string,
    password_hash: hashPassword(clean!.password as string),
    age: (clean!.age ?? null) as number | null,
    sex: (clean!.sex ?? null) as string | null,
    role,
  });

  return json({ message: "User created successfully.", user: await userToDict(user, true) }, 201);
}