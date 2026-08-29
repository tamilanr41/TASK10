import { SEVERITY_GUIDANCE } from "./conditions";

const PRECAUTIONS = [
  "Maintain appropriate scalp hygiene with a gentle cleansing routine.",
  "Avoid excessive scratching of the scalp or nails.",
  "Avoid sharing combs, brushes, towels and grooming tools.",
  "Keep nails clean and dry.",
  "Monitor whether symptoms are worsening, spreading or affecting daily life.",
];

const HOME_CARE = [
  "Use gentle, non-irritating hair-care products suitable for sensitive skin.",
  "Pat hair and scalp dry instead of rubbing vigorously.",
  "Trim nails to a moderate length instead of pulling or biting.",
  "Give your hair and nails temporary breaks from frequent chemical treatments.",
];

const AVOID = [
  "Avoid unnecessary chemical products and aggressive nail products.",
  "Avoid tight hairstyles or tools that pull repeatedly at the hair.",
  "Avoid picking or peeling flaking skin or nails.",
  "Avoid self-medicating with over-the-counter treatments meant for other conditions.",
];

const CONSULT_SIGNS = [
  "Symptoms are worsening or spreading",
  "Pain, swelling, or signs of possible infection",
  "Multiple areas are affected",
  "Significant sudden hair loss",
  "The issue persists despite basic home care after a few weeks",
];

export function runRecommendations(
  overallSeverity: string,
  _findings: Record<string, Record<string, unknown>>,
  _symptoms: Record<string, unknown>,
  _nutrition: unknown
): Record<string, unknown> {
  const severity = overallSeverity;
  const severityGuidance = SEVERITY_GUIDANCE[severity] || SEVERITY_GUIDANCE.low;
  const consult = [...CONSULT_SIGNS];
  if (severity === "high") {
    consult.unshift(
      "A qualified dermatologist/healthcare professional consultation is clearly recommended given the assessed severity."
    );
  }
  return {
    general_precautions: PRECAUTIONS,
    home_care_suggestions: HOME_CARE,
    things_to_avoid: AVOID,
    when_to_consult: consult,
    severity_guidance: severityGuidance,
    consult_inferred: severity === "moderate" || severity === "high",
    non_prescriptive_note:
      "These are general wellness suggestions only. They are not medical treatment instructions.",
  };
}