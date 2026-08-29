import db, { ReminderRow, reminderToDict, UserRow } from "@/lib/db";
import { json, jsonError, requireAuth, isError, readJson } from "@/lib/http";
import { validateReminder } from "@/lib/validation";

export async function GET() {
  const session = await requireAuth();
  if (isError(session)) return session;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.userId) as
    | UserRow
    | undefined;
  if (!user) return jsonError("User not found.", 404);

  const items = db
    .prepare("SELECT * FROM reminders WHERE user_id = ? ORDER BY created_at DESC")
    .all(session.userId) as ReminderRow[];
  return json({ reminders: items.map(reminderToDict) });
}

export async function POST(req: Request) {
  const session = await requireAuth();
  if (isError(session)) return session;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.userId) as
    | UserRow
    | undefined;
  if (!user) return jsonError("User not found.", 404);

  const data = await readJson(req);
  const errors = validateReminder(data);
  if (Object.keys(errors).length) {
    return jsonError("Validation failed", 400, { fields: errors });
  }

  const info = db
    .prepare(
      `INSERT INTO reminders (user_id, title, description, reminder_date, reminder_time, repeat_frequency, is_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      user.id,
      String(data.title || "").trim(),
      String(data.description || "").trim(),
      String(data.reminder_date || "").trim(),
      String(data.reminder_time || "").trim(),
      String(data.repeat_frequency || "none").trim(),
      data.is_enabled === undefined ? 1 : data.is_enabled ? 1 : 0
    );

  const reminder = db
    .prepare("SELECT * FROM reminders WHERE id = ?")
    .get(info.lastInsertRowid) as ReminderRow;
  return json({ message: "Reminder created.", reminder: reminderToDict(reminder) }, 201);
}