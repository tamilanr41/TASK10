import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, userToDict } from "@/lib/db";
import { checkPassword, signToken } from "@/lib/auth";
import { json, jsonError, readJson } from "@/lib/http";

export async function POST(req: NextRequest) {
  const data = await readJson(req);
  const email = String(data.email || "").trim().toLowerCase();
  const password = String(data.password || "");

  if (!email || !password) {
    return jsonError("Email and password are required.", 400);
  }

  const user = await getUserByEmail(email);
  if (!user || !checkPassword(user.password_hash, password)) {
    return jsonError("Incorrect email or password.", 401);
  }
  if (!user.is_active) {
    return jsonError("This account has been disabled. Contact support.", 403);
  }

  const token = await signToken(user.id, user.role);
  const res = json({ message: "Login successful.", token, user: await userToDict(user) });
  res.cookies.set("dermai_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return res;
}