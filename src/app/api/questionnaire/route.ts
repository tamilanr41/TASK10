import { NextRequest } from "next/server";
import { getQuestions, STAGE_ORDER } from "@/lib/ai/questionnaire";
import { json, jsonError } from "@/lib/http";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const screeningType = params.get("type") || "scalp";
  const stage = params.get("stage") || "general";

  if (!["scalp", "nails", "combined"].includes(screeningType)) {
    return jsonError("Invalid screening type.", 400);
  }
  if (!STAGE_ORDER.includes(stage)) {
    return jsonError("Invalid stage.", 400);
  }

  let answers: Record<string, unknown> = {};
  const prior = params.get("answers");
  if (prior) {
    try {
      answers = JSON.parse(prior);
    } catch {
      answers = {};
    }
  }

  try {
    const qs = getQuestions(screeningType, stage, answers);
    return json({ stage, questions: qs });
  } catch (e) {
    return jsonError(String((e as Error).message || "Invalid stage."), 400);
  }
}