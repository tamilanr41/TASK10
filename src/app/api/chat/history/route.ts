import db, { chatToDict, ChatRow } from "@/lib/db";
import { json, requireAuth, isError } from "@/lib/http";

export async function GET() {
  const session = await requireAuth();
  if (isError(session)) return session;

  const msgs = db
    .prepare("SELECT * FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC LIMIT 100")
    .all(session.userId) as ChatRow[];

  return json({ messages: msgs.map(chatToDict) });
}