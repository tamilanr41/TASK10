import { getUserById, getReminderById, updateReminderById, deleteReminderById, reminderToDict } from "@/lib/db";
import { json, jsonError, requireAuth, isError, readJson } from "@/lib/http";

type Ctx = { params: { id: string } };

export async function PUT(req: Request, ctx: Ctx) {
  const session = await requireAuth();
  if (isError(session)) return session;

  const user = await getUserById(session.userId);
  const reminder = await getReminderById(Number(ctx.params.id));
  if (!reminder || reminder.user_id !== user?.id) return jsonError("Reminder not found.", 404);

  const data = await readJson(req);
  const fields: Record<string, unknown> = {};
  const list = [
    "is_enabled",
    "title",
    "description",
    "reminder_date",
    "reminder_time",
    "repeat_frequency",
  ] as const;
  for (const f of list) {
    if (f in data) {
      if (f === "is_enabled") fields[f] = data[f] ? 1 : 0;
      else fields[f] = String(data[f] ?? "").trim();
    }
  }
  if (Object.keys(fields).length) await updateReminderById(Number(ctx.params.id), fields);

  const updated = await getReminderById(Number(ctx.params.id));
  return json({ message: "Reminder updated.", reminder: updated ? reminderToDict(updated) : null });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await requireAuth();
  if (isError(session)) return session;

  const user = await getUserById(session.userId);
  const reminder = await getReminderById(Number(ctx.params.id));
  if (!reminder || reminder.user_id !== user?.id) return jsonError("Reminder not found.", 404);

  await deleteReminderById(Number(ctx.params.id));
  return json({ message: "Reminder deleted." });
}