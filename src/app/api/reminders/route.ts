import { getUserById, listRemindersByUser, insertReminder, reminderToDict } from "@/lib/db";
import { json, jsonError, requireAuth, isError, readJson } from "@/lib/http";
import { validateReminder } from "@/lib/validation";

export async function GET() {
  const session = await requireAuth();
  if (isError(session)) return session;

  const user = await getUserById(session.userId);
  if (!user) return jsonError("User not found.", 404);

  const items = await listRemindersByUser(session.userId);
  return json({ reminders: items.map(reminderToDict) });
}

export async function POST(req: Request) {
  const session = await requireAuth();
  if (isError(session)) return session;

  const user = await getUserById(session.userId);
  if (!user) return jsonError("User not found.", 404);

  const data = await readJson(req);
  const errors = validateReminder(data);
  if (Object.keys(errors).length) {
    return jsonError("Validation failed", 400, { fields: errors });
  }

  const reminder = await insertReminder({
    user_id: user.id,
    title: String(data.title || "").trim(),
    description: String(data.description || "").trim(),
    reminder_date: String(data.reminder_date || "").trim(),
    reminder_time: String(data.reminder_time || "").trim(),
    repeat_frequency: String(data.repeat_frequency || "none").trim(),
    is_enabled: data.is_enabled === undefined ? 1 : data.is_enabled ? 1 : 0,
  });
  return json({ message: "Reminder created.", reminder: reminderToDict(reminder) }, 201);
}