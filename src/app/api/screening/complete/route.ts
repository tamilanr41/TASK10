import { NextRequest } from "next/server";
import db, { screeningToDict, ScreeningRow, loadJson, UserRow } from "@/lib/db";
import { json, jsonError, requireAuth, isError, readJson } from "@/lib/http";
import { normalizeAnswers } from "@/lib/ai/questionnaire";
import { runMultimodal } from "@/lib/ai/multimodal";
import { runNutrition } from "@/lib/ai/nutrition";
import { runRecommendations } from "@/lib/ai/recommendations";
import { filterDoctors, suggestConsultText } from "@/lib/ai/doctorMatcher";
import { generatePdfReport } from "@/lib/pdf";
import fs from "node:fs";
import path from "node:path";
import { REPORT_DIR, MODEL_VERSION } from "@/lib/paths";

function validateOwnedPath(rel: string): boolean {
  const cleaned = rel.replace(/\\/g, "/");
  return cleaned.startsWith("scalp/") || cleaned.startsWith("nails/");
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (isError(session)) return session;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.userId) as
    | UserRow
    | undefined;
  if (!user) return jsonError("User not found.", 404);

  const data = await readJson(req);
  const screeningType = String(data.screening_type || "").trim().toLowerCase();
  if (!["scalp", "nails", "combined"].includes(screeningType)) {
    return jsonError("Invalid screening type.", 400);
  }

  const scalpPred = (data.scalp_prediction as Record<string, unknown>) || null;
  const nailPred = (data.nail_prediction as Record<string, unknown>) || null;
  const scalpRel = String(data.scalp_image_path || "").trim();
  const nailRel = String(data.nail_image_path || "").trim();
  const rawAnswers = (data.symptoms as Record<string, unknown>) || {};
  const explainability = data.explainability === true;

  if (scalpRel && !validateOwnedPath(scalpRel)) {
    return jsonError("Invalid image path reference.", 400);
  }
  if (nailRel && !validateOwnedPath(nailRel)) {
    return jsonError("Invalid image path reference.", 400);
  }

  const { answers, diet } = normalizeAnswers(rawAnswers);
  const mode = "demo";

  const combined = runMultimodal({
    screeningType,
    scalpPred,
    nailPred,
    symptoms: answers,
    dietInfo: diet,
  });
  const nutrition = runNutrition(combined.findings, answers, diet);
  const recommendations = runRecommendations(
    String(combined.overall.severity),
    combined.findings,
    answers,
    nutrition
  );

  const severity = String(combined.overall.severity);
  const doctors = db
    .prepare("SELECT * FROM doctors WHERE is_sample = 1")
    .all() as Array<Record<string, unknown>>;
  const matched = filterDoctors(
    { city: data.city || "", screening_area: screeningType, severity },
    doctors as never[]
  ).slice(0, 3);
  const doctorRec = {
    suggest_text: suggestConsultText(screeningType, severity),
    matched: matched.map((d) => ({
      id: d.id,
      name: d.name,
      specialization: d.specialization,
      clinic: d.clinic,
      location: d.location,
      contact: d.contact,
      city: d.city,
      is_sample: !!d.is_sample,
    })),
  };
  const hydration = (nutrition.hydration as { guidance?: string }) || {};

  const info = db
    .prepare(
      `INSERT INTO screenings (
        user_id, screening_type, mode, model_version,
        scalp_image_path, nail_image_path,
        symptoms, diet_info, predictions,
        overall_condition, overall_confidence, overall_severity, summary_text,
        nutrition_insights, hydration_insight, recommendations, doctor_recommendation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      session.userId,
      screeningType,
      mode,
      MODEL_VERSION,
      scalpRel || null,
      nailRel || null,
      JSON.stringify({ answers, diet }),
      JSON.stringify(diet),
      JSON.stringify(combined),
      String(combined.overall.condition),
      Number(combined.overall.confidence),
      severity,
      String(combined.overall.summary),
      JSON.stringify(nutrition),
      String(hydration.guidance || ""),
      JSON.stringify(recommendations),
      JSON.stringify(doctorRec)
    );

  const screening = db
    .prepare("SELECT * FROM screenings WHERE id = ?")
    .get(info.lastInsertRowid) as ScreeningRow;

  // PDF report (best-effort, like the backend)
  try {
    const buf = await generatePdfReport(
      { name: user.name, age: user.age, sex: user.sex, email: user.email },
      screeningToDict(screening)
    );
    fs.mkdirSync(REPORT_DIR, { recursive: true });
    const stamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d+Z$/, "Z")
      .replace(/T/, "");
    const reportName = `dermai_screening_${screening.id}_${stamp}.pdf`;
    const reportRel = path.join("reports", reportName).replace(/\\/g, "/");
    fs.writeFileSync(path.join(REPORT_DIR, reportName), buf);
    db.prepare("UPDATE screenings SET report_path = ? WHERE id = ?").run(reportRel, screening.id);
    screening.report_path = reportRel;
  } catch {
    // PDF generation is best-effort.
  }

  return json({
    message: "Screening completed.",
    screening: screeningToDict(screening),
    is_demo: mode === "demo",
  });
}