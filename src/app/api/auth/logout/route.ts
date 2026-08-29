import { NextResponse } from "next/server";
import { json } from "@/lib/http";

export async function POST() {
  const res = json({ message: "Logged out successfully." });
  res.cookies.set("dermai_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}