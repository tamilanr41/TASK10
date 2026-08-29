import { NextRequest } from "next/server";
import { listUsers, userToDict } from "@/lib/db";
import { json, requireAdmin, isError } from "@/lib/http";

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