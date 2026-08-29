import db, { ScreeningRow } from "@/lib/db";
import { json, jsonError, requireAuth, isError, readJson } from "@/lib/http";
import { chatbotRespond, CHAT_DISCLAIMER } from "@/lib/ai/chatbot";

export async function POST(req: Request) {
  const session = await requireAuth();
  if (isError(session)) return session;

  const data = await readJson(req);
  const msg = String(data.message || "").trim();
  if (!msg) return jsonError("Message cannot be empty.", 400);

  const latestRow = db
    .prepare("SELECT * FROM screenings WHERE user_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(session.userId) as ScreeningRow | undefined;

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

  db.prepare("INSERT INTO chat_messages (user_id, role, content) VALUES (?, ?, ?)").run(
    session.userId,
    "user",
    msg
  );
  db.prepare("INSERT INTO chat_messages (user_id, role, content) VALUES (?, ?, ?)").run(
    session.userId,
    "assistant",
    reply
  );

  return json({ reply, disclaimer: CHAT_DISCLAIMER });
}