import { NextRequest } from "next/server";
import db, { userToDict, UserRow } from "@/lib/db";
import { json, requireAdmin, isError } from "@/lib/http";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (isError(admin)) return admin;

  const search = (req.nextUrl.searchParams.get("search") || "").trim().toLowerCase();
  let rows: UserRow[];
  if (search) {
    rows = db
      .prepare(
        "SELECT * FROM users WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? ORDER BY created_at DESC LIMIT 200"
      )
      .all(`%${search}%`, `%${search}%`) as UserRow[];
  } else {
    rows = db.prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT 200").all() as UserRow[];
  }

  const countStmt = db.prepare("SELECT COUNT(*) AS n FROM screenings WHERE user_id = ?");
  const users = rows.map((u) => ({
    ...userToDict(u, true),
    screening_count: (countStmt.get(u.id) as { n: number }).n,
  }));

  return json({ users });
}