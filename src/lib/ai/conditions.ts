export type ConditionMeta = {
  label: string;
  category: string;
  default_confidence: number;
  default_severity: string;
  explanation: string;
};

export const CONDITION_LIBRARY: Record<string, ConditionMeta> = {
  dandruff: {
    label: "Dandruff",
    category: "scalp",
    default_confidence: 0.82,
    default_severity: "mild",
    explanation:
      "Visible flaking and scaling on the scalp are characteristics often seen with dandruff. Environmental factors, hair-care routines and individual scalp sensitivity can all play a role.",
  },
  dry_scalp: {
    label: "Dry scalp",
    category: "scalp",
    default_confidence: 0.74,
    default_severity: "mild",
    explanation:
      "A dry, tight or itchy scalp with fine flakes may point to a dry scalp pattern, which is different from dandruff. Weather and product routine changes can contribute.",
  },
  scalp_irritation: {
    label: "Scalp irritation",
    category: "scalp",
    default_confidence: 0.71,
    default_severity: "mild",
    explanation:
      "Redness, itching and irritation of the scalp can result from product sensitivity, over-washing or contact factors. Monitoring and routine adjustment are reasonable first steps.",
  },
  possible_fungal_scalp: {
    label: "Possible fungal scalp condition",
    category: "scalp",
    default_confidence: 0.66,
    default_severity: "moderate",
    explanation:
      "The combination of flakes, itching and affected areas could sometimes be associated with a fungal scalp condition. This is only a possibility based on the image and answers; a qualified dermatologist should make the actual assessment.",
  },
  other_scalp_abnormality: {
    label: "Other scalp abnormality",
    category: "scalp",
    default_confidence: 0.52,
    default_severity: "low",
    explanation:
      "Some scalp findings were noted that do not strongly match a single common pattern. Professional evaluation is recommended for clarity.",
  },
  hair_thinning: {
    label: "Hair thinning",
    category: "hair",
    default_confidence: 0.76,
    default_severity: "moderate",
    explanation:
      "Reduced density or widening of hair coverage can be associated with hair thinning. Multiple factors including nutrition, genetics and stress can influence hair density.",
  },
  excessive_hair_fall: {
    label: "Excessive hair fall",
    category: "hair",
    default_confidence: 0.79,
    default_severity: "moderate",
    explanation:
      "Reported or visible hair fall beyond the usual amount may indicate a temporary shedding episode, which can relate to stress, nutrition or hair-care habits.",
  },
  patchy_hair_loss: {
    label: "Circular/patchy hair loss",
    category: "hair",
    default_confidence: 0.62,
    default_severity: "moderate",
    explanation:
      "Circular or patchy hair loss is a specific pattern that should be reviewed by a qualified professional, as it may correspond to patterns that need clinical evaluation.",
  },
  other_hair_abnormality: {
    label: "Other hair abnormality",
    category: "hair",
    default_confidence: 0.5,
    default_severity: "low",
    explanation:
      "Hair findings were noted that do not clearly match a common pattern. A professional hair and scalp assessment is recommended.",
  },
  brittle_nails: {
    label: "Brittle nails",
    category: "nails",
    default_confidence: 0.8,
    default_severity: "mild",
    explanation:
      "Nails that chip, split or break easily can be described as brittle. Repeated wetting, drying and some products can contribute to nail brittleness.",
  },
  nail_discoloration: {
    label: "Nail discoloration",
    category: "nails",
    default_confidence: 0.75,
    default_severity: "moderate",
    explanation:
      "Changes in nail color were noted. Discoloration has many possible causes ranging from harmless staining to conditions that a professional should evaluate.",
  },
  possible_fungal_nail: {
    label: "Possible fungal nail condition",
    category: "nails",
    default_confidence: 0.68,
    default_severity: "moderate",
    explanation:
      "Thickening, discoloration and texture changes together can sometimes be associated with a fungal nail condition. This remains a possibility only and requires professional confirmation.",
  },
  nail_separation: {
    label: "Nail separation",
    category: "nails",
    default_confidence: 0.6,
    default_severity: "moderate",
    explanation:
      "Separation of the nail from the nail bed was noted. This should be examined by a healthcare professional to rule out underlying causes.",
  },
  other_nail_abnormality: {
    label: "Other nail abnormality",
    category: "nails",
    default_confidence: 0.5,
    default_severity: "low",
    explanation:
      "Nail findings were noted that do not clearly match a common pattern. Professional evaluation is recommended.",
  },
};

export function getCondition(key: string): ConditionMeta | undefined {
  return CONDITION_LIBRARY[key];
}

export const SEVERITY_GUIDANCE: Record<string, string> = {
  low: "General wellness guidance and monitoring.",
  moderate: "Recommend monitoring and considering consultation with a healthcare professional.",
  high: "Clearly recommend consultation with a qualified dermatologist/healthcare professional.",
};

export const DEMO_DISCLAIMER =
  "DEMO / PROTOTYPE AI RESULT. This prediction was produced by the built-in prototype engine and not by a trained medical CNN. It is for demonstration of the workflow only.";

export const SUGGESTED_IMAGE_DIMENSION = 400;