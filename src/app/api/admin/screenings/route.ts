import { NextRequest } from "next/server";
import { listScreeningsWithUser, screeningToDict } from "@/lib/db";
import { json, requireAdmin, isError } from "@/lib/http";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const search = (req.nextUrl.searchParams.get("search") || "").trim();
  const rows = await listScreeningsWithUser(search || undefined);
  const screenings = rows.map((r) => ({
    ...screeningToDict(r),
    user_name: r.user_name,
    user_email: r.user_email,
  }));

  return json({ screenings });
}