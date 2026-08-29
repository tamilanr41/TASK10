import { NextRequest } from "next/server";
import { getUserByEmail, userToDict } from "@/lib/db";
import { checkPassword, signToken } from "@/lib/auth";
import { json, jsonError, readJson } from "@/lib/http";

export async function POST(req: NextRequest) {
  const data = await readJson(req);
  const email = String(data.email || "").trim().toLowerCase();
  const password = String(data.password || "");

  const user = await getUserByEmail(email);
  if (!user || user.role !== "admin") {
    return jsonError("Not an administrator account.", 403);
  }
  if (!checkPassword(user.password_hash, password)) {
    return jsonError("Incorrect password.", 401);
  }
  if (!user.is_active) {
    return jsonError("Account disabled.", 403);
  }

  const token = await signToken(user.id, "admin");
  const res = json({ token, user: await userToDict(user) });
  res.cookies.set("dermai_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return res;
}