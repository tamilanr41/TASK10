import { listLatestScreening, insertChatMessage } from "@/lib/db";
import { json, jsonError, requireAuth, isError, readJson } from "@/lib/http";
import { chatbotRespond, CHAT_DISCLAIMER } from "@/lib/ai/chatbot";

export async function POST(req: Request) {
  const session = await requireAuth();
  if (isError(session)) return session;

  const data = await readJson(req);
  const msg = String(data.message || "").trim();
  if (!msg) return jsonError("Message cannot be empty.", 400);

  const latestRow = await listLatestScreening(session.userId);

  const latestCtx = latestRow
    ? {
        created_at: latestRow.created_at,
        screening_type: latestRow.screening_type,
        overall_severity: latestRow.overall_severity,
        overall_confidence: latestRow.overall_confidence,
        predictions: (() => {
          try {
            return JSON.parse(latestRow.predictions || "null");
          } catch {
            return null;
          }
        })(),
      }
    : null;

  const reply = chatbotRespond(msg, latestCtx);

  await insertChatMessage(session.userId, "user", msg);
  await insertChatMessage(session.userId, "assistant", reply);

  return json({ reply, disclaimer: CHAT_DISCLAIMER });
}