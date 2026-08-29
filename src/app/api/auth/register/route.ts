import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, insertUser, userToDict } from "@/lib/db";
import { hashPassword, checkPassword, signToken } from "@/lib/auth";
import { validateSignup } from "@/lib/validation";
import { json, jsonError, readJson } from "@/lib/http";

const COOKIE = "dermai_token";

function setAuthCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
}

export async function POST(req: NextRequest) {
  const data = await readJson(req);
  const { errors, clean } = validateSignup(data);
  if (errors && Object.keys(errors).length)
    return jsonError("Validation failed", 400, { fields: errors });

  const existing = await getUserByEmail(clean!.email as string);
  if (existing) return jsonError("This email is already registered.", 409);

  const user = await insertUser({
    name: clean!.name as string,
    email: clean!.email as string,
    password_hash: hashPassword(clean!.password as string),
    age: (clean!.age ?? null) as number | null,
    sex: (clean!.sex ?? null) as string | null,
    role: "user",
  });
  const token = await signToken(user.id, user.role);

  const res = json(
    { message: "Account created successfully.", token, user: await userToDict(user) },
    201
  );
  setAuthCookie(res, token);
  return res;
}