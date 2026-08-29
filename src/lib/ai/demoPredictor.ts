import crypto from "node:crypto";
import { CONDITION_LIBRARY, DEMO_DISCLAIMER, SUGGESTED_IMAGE_DIMENSION } from "./conditions";

export type DemoPrediction = Record<string, unknown> & {
  key: string;
  label: string;
  category: string;
  confidence: number;
  severity: string;
  explanation: string;
  is_demo: boolean;
  demo_label: string;
  demo_disclaimer: string;
  image_features: Record<string, number>;
};

function hashBuffer(buffer: Buffer): string {
  const head = buffer.subarray(0, 65536);
  const sizeBuf = Buffer.alloc(8);
  sizeBuf.writeBigUInt64BE(BigInt(buffer.length));
  return crypto.createHash("sha256").update(head).update(sizeBuf).digest("hex");
}

function computeFeatures(buffer: Buffer, w: number, h: number): { scalar: number; quality_ok: boolean; width: number; height: number } {
  const digest = hashBuffer(buffer);
  const h1 = parseInt(digest.slice(0, 8), 16) / 0xffffffff;
  const h2 = parseInt(digest.slice(8, 16), 16) / 0xffffffff;
  const scalar = ((h1 + h2) / 2 - 0.5) * 2;
  return {
    scalar: Math.round(scalar * 10000) / 10000,
    quality_ok: w >= SUGGESTED_IMAGE_DIMENSION && h >= SUGGESTED_IMAGE_DIMENSION,
    width: w,
    height: h,
  };
}

function pickCondition(buffer: Buffer, category: string, scalar: number): string {
  const digest = hashBuffer(buffer);
  const bucket = parseInt(digest.slice(-6), 16) % 100;
  const pool = category === "nails" ? "nails" : "scalp";
  const keys = Object.keys(CONDITION_LIBRARY).filter((k) => CONDITION_LIBRARY[k].category === pool);
  const primary = pool === "scalp"
    ? ["dandruff", "dry_scalp", "scalp_irritation", "possible_fungal_scalp"]
    : ["brittle_nails", "nail_discoloration", "possible_fungal_nail", "nail_separation"];
  const fallback = pool === "scalp" ? ["other_scalp_abnormality"] : ["other_nail_abnormality"];
  if (bucket < 55) return primary[bucket % primary.length];
  if (bucket < 90) return primary[(bucket * 7) % primary.length];
  return fallback[0];
}

function estimateSeverity(base: string, scalar: number): string {
  if (base === "moderate") return scalar > 0.45 ? "high" : "moderate";
  if (base === "mild") return scalar > 0.55 ? "moderate" : "mild";
  return base;
}

/** Deterministic prototype predictor. Replaces the Flask DemoPredictor 1:1. */
export function predictDemo(
  buffer: Buffer,
  w: number,
  h: number,
  category: "scalp" | "hair" | "nails"
): DemoPrediction {
  const features = computeFeatures(buffer, w, h);
  const scalar = features.scalar;
  const conditionKey = pickCondition(buffer, category, scalar);
  const condition = CONDITION_LIBRARY[conditionKey];

  const confidence = Math.round(Math.min(0.97, condition.default_confidence + scalar * 0.08) * 1000) / 1000;
  const severity = estimateSeverity(condition.default_severity, scalar);

  const explanation =
    condition.explanation +
    " Note: " +
    (features.quality_ok
      ? "The image was processed at the recommended resolution."
      : "A lower-resolution image was processed.");

  const imageFeatures: Record<string, number> = {};
  for (const [k, v] of Object.entries(features)) {
    if (typeof v === "number") imageFeatures[k] = v;
  }

  return {
    key: conditionKey,
    label: condition.label,
    category: condition.category,
    confidence,
    severity,
    explanation,
    is_demo: true,
    demo_label: "DEMO / PROTOTYPE AI RESULT",
    demo_disclaimer: DEMO_DISCLAIMER,
    image_features: imageFeatures,
  };
}