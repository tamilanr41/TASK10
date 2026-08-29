import { chatToDict, listChatByUser } from "@/lib/db";
import { json, requireAuth, isError } from "@/lib/http";

export async function GET() {
  const session = await requireAuth();
  if (isError(session)) return session;

  const msgs = await listChatByUser(session.userId);

  return json({ messages: msgs.map(chatToDict) });
}