import { CONDITION_LIBRARY, DEMO_DISCLAIMER } from "./conditions";

export const SEVERITY_WEIGHTS: Record<string, number> = { low: 1, moderate: 2, high: 3 };
export const SEVERITY_REVERSE: Record<number, string> = { 1: "low", 2: "moderate", 3: "high" };

export function num(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

function isTruthy(value: unknown): boolean {
  return value === true || value === "Yes" || value === "yes" || value === "true" || value === 1 || value === "1";
}

function bumpSeverity(severity: string): string {
  const next = Math.min(3, (SEVERITY_WEIGHTS[severity] || 1) + 1);
  return SEVERITY_REVERSE[next];
}

function scalpSymptomSupport(symptoms: Record<string, unknown>): number {
  let score = 0;
  let support = 0;
  if (num(symptoms.itching) > 0) {
    support += Math.min(1, num(symptoms.itching) / 10);
    score += 1;
  }
  if (num(symptoms.scaling) > 0) {
    support += Math.min(1, num(symptoms.scaling) / 10);
    score += 1;
  }
  for (const key of ["flaking", "scalp_redness", "dandruff_excess"]) {
    if (isTruthy(symptoms[key])) {
      support += 0.8;
      score += 1;
    }
  }
  if (num(symptoms.itching_severity) > 0) {
    support += Math.min(1, num(symptoms.itching_severity) / 10);
    score += 1;
  }
  if (score === 0) return 0;
  return Math.round((support / score) * 1000) / 1000;
}

function nailSymptomSupport(symptoms: Record<string, unknown>): number {
  let score = 0;
  let support = 0;
  for (const key of ["nail_brittle", "nail_discoloration", "nail_thickening", "nail_pain"]) {
    if (isTruthy(symptoms[key])) {
      support += 0.8;
      score += 1;
    }
  }
  if (isTruthy(symptoms.pain)) {
    support += 0.7;
    score += 1;
  }
  for (const key of ["nail_separation", "nail_spreading"]) {
    if (isTruthy(symptoms[key])) {
      support += 0.75;
      score += 1;
    }
  }
  if (score === 0) return 0;
  return Math.round((support / score) * 1000) / 1000;
}

function stripPrefix(label?: string | null): string {
  const text = (label || "").toLowerCase();
  if (text.startsWith("possible ")) return text.slice("possible ".length);
  return text;
}

function deriveHairFinding(
  symptoms: Record<string, unknown>,
  scalpPred: Record<string, unknown> | null
): Record<string, unknown> | null {
  const hairFall = num(symptoms.hair_fall);
  const thinning = isTruthy(symptoms.thinning_increase);
  const patchy = isTruthy(symptoms.patchy_hair_loss);

  let support = Math.min(1, hairFall / 10) * 0.5 + (thinning ? 0.8 : 0) || 0;
  if (patchy) support = Math.max(support, 0.85);

  if (support === 0) return null;

  let key: string;
  if (patchy && support > 0.7) key = "patchy_hair_loss";
  else if (thinning && hairFall >= 5) key = "hair_thinning";
  else if (hairFall >= 6) key = "excessive_hair_fall";
  else if (hairFall >= 4 || thinning) key = "hair_thinning";
  else return null;

  const cond = CONDITION_LIBRARY[key];
  const confidence = Math.round(Math.min(0.93, 0.55 + support * 0.35) * 1000) / 1000;
  const severity = hairFall >= 7 || patchy ? "moderate" : "mild";

  return {
    key,
    label: cond.label,
    category: "hair",
    confidence,
    severity,
    explanation:
      cond.explanation + " This hair-related finding was derived from your symptom answers.",
    is_demo: !!(scalpPred && scalpPred.is_demo),
    finding_type: "hair",
    symptom_support: Math.round(support * 1000) / 1000,
  };
}

function overall(
  screeningType: string,
  findings: Record<string, Record<string, unknown>>,
  _symptoms: Record<string, unknown>,
  _dietInfo: Record<string, unknown>
): Record<string, unknown> {
  const counts = Object.keys(findings).length;
  const severities = Object.values(findings).map((f) => f.severity as string);
  const confidences = Object.values(findings).map((f) => (f as { confidence?: number }).confidence || 0);

  let mergedSeverity = "low";
  if (severities.length) {
    const total = severities.reduce((acc, s) => acc + (SEVERITY_WEIGHTS[s] || 1), 0);
    const avg = total / severities.length;
    mergedSeverity = SEVERITY_REVERSE[Math.min(3, Math.max(1, Math.round(avg)))];
  }

  const overallConf = confidences.length ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 1000) / 1000 : 0.5;

  let condition: string;
  if (screeningType === "combined") condition = "Combined scalp/hair and nail findings";
  else if (screeningType === "scalp") condition = "Scalp/hair-related finding";
  else condition = "Nail-related finding";

  if (counts === 1) condition = String(Object.values(findings)[0].label);

  let summary: string;
  if (counts === 0) {
    summary =
      "The screening did not identify a clear specific pattern from the information provided. This is common and not a diagnosis. Continue monitoring and consult a professional if symptoms persist.";
  } else {
    const parts: string[] = [];
    if (findings.scalp) parts.push(`scalp: possible ${stripPrefix(String(findings.scalp.label))}`);
    if (findings.hair) parts.push(`hair: possible ${stripPrefix(String(findings.hair.label))}`);
    if (findings.nails) parts.push(`nails: possible ${stripPrefix(String(findings.nails.label))}`);
    summary = "The screening indicates possible findings: " + parts.join("; ") + ".";
    if (screeningType === "combined") {
      summary +=
        " The screening detected findings affecting both the scalp/hair and nails. These results are preliminary and should not be considered a medical diagnosis.";
    }
  }

  return {
    condition,
    confidence: overallConf,
    severity: mergedSeverity,
    findings_count: counts,
    summary,
  };
}

export type MultimodalInput = {
  screeningType: string;
  scalpPred?: Record<string, unknown> | null;
  nailPred?: Record<string, unknown> | null;
  symptoms?: Record<string, unknown> | null;
  dietInfo?: Record<string, unknown> | null;
};

export function runMultimodal(input: MultimodalInput): {
  findings: Record<string, Record<string, unknown>>;
  overall: Record<string, unknown>;
  demo_disclaimer: string;
} {
  const { screeningType, scalpPred = null, nailPred = null, symptoms = {}, dietInfo = {} } = input;
  const sym: Record<string, unknown> = symptoms || {};
  const diet: Record<string, unknown> = dietInfo || {};
  const findings: Record<string, Record<string, unknown>> = {};

  if ((screeningType === "scalp" || screeningType === "combined") && scalpPred) {
    const scalp = { ...scalpPred };
    scalp.symptom_support = scalpSymptomSupport(sym);
    if (num(scalp.symptom_support) > 0.55 && scalp.severity === "mild") {
      scalp.severity = bumpSeverity(String(scalp.severity));
      scalp.confidence = Math.round(Math.min(0.95, Number(scalp.confidence) + 0.04) * 1000) / 1000;
    }
    scalp.finding_type = "scalp";
    findings.scalp = scalp;
  }

  if (screeningType === "scalp" || screeningType === "combined") {
    const hair = deriveHairFinding(sym, scalpPred);
    if (hair) findings.hair = hair;
  }

  if ((screeningType === "nails" || screeningType === "combined") && nailPred) {
    const nails = { ...nailPred };
    nails.symptom_support = nailSymptomSupport(sym);
    if (num(nails.symptom_support) > 0.55 && nails.severity === "mild") {
      nails.severity = bumpSeverity(String(nails.severity));
    }
    nails.finding_type = "nails";
    findings.nails = nails;
  }

  return {
    findings,
    overall: overall(screeningType, findings, sym, diet),
    demo_disclaimer: DEMO_DISCLAIMER,
  };
}