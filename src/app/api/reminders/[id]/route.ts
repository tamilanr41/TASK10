import db, { ReminderRow, reminderToDict, UserRow } from "@/lib/db";
import { json, jsonError, requireAuth, isError, readJson } from "@/lib/http";

type Ctx = { params: { id: string } };

export async function PUT(req: Request, ctx: Ctx) {
  const session = await requireAuth();
  if (isError(session)) return session;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.userId) as
    | UserRow
    | undefined;
  const reminder = db.prepare("SELECT * FROM reminders WHERE id = ?").get(ctx.params.id) as
    | ReminderRow
    | undefined;
  if (!reminder || reminder.user_id !== user?.id) return jsonError("Reminder not found.", 404);

  const data = await readJson(req);
  const sets: string[] = [];
  const vals: unknown[] = [];
  const fields = [
    "is_enabled",
    "title",
    "description",
    "reminder_date",
    "reminder_time",
    "repeat_frequency",
  ] as const;
  for (const f of fields) {
    if (f in data) {
      if (f === "is_enabled") {
        sets.push("is_enabled = ?");
        vals.push(data[f] ? 1 : 0);
      } else {
        sets.push(`${f} = ?`);
        vals.push(String(data[f] ?? "").trim());
      }
    }
  }
  if (sets.length) {
    db.prepare(`UPDATE reminders SET ${sets.join(", ")} WHERE id = ?`).run(...vals, ctx.params.id);
  }

  const updated = db.prepare("SELECT * FROM reminders WHERE id = ?").get(ctx.params.id) as ReminderRow;
  return json({ message: "Reminder updated.", reminder: reminderToDict(updated) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await requireAuth();
  if (isError(session)) return session;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.userId) as
    | UserRow
    | undefined;
  const reminder = db.prepare("SELECT * FROM reminders WHERE id = ?").get(ctx.params.id) as
    | ReminderRow
    | undefined;
  if (!reminder || reminder.user_id !== user?.id) return jsonError("Reminder not found.", 404);

  db.prepare("DELETE FROM reminders WHERE id = ?").run(ctx.params.id);
  return json({ message: "Reminder deleted." });
}