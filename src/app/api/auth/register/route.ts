import { NextRequest, NextResponse } from "next/server";
import db, { userToDict, UserRow } from "@/lib/db";
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

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(clean!.email as string);
  if (existing) return jsonError("This email is already registered.", 409);

  const info = db
    .prepare(
      "INSERT INTO users (name, email, password_hash, age, sex, role) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(
      clean!.name,
      clean!.email,
      hashPassword(clean!.password as string),
      clean!.age ?? null,
      clean!.sex ?? null,
      "user"
    );

  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(info.lastInsertRowid) as UserRow;
  const token = await signToken(user.id, user.role);

  const res = json(
    { message: "Account created successfully.", token, user: userToDict(user) },
    201
  );
  setAuthCookie(res, token);
  return res;
}