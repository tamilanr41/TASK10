export type Question = {
  id: string;
  key: string;
  stage: string;
  label: string;
  type: string;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  min_label?: string;
  max_label?: string;
  placeholder?: string;
  optional?: boolean;
  show_if?: Record<string, string>;
};

export const QUESTION_BANK: Record<string, Question> = {
  // ------------------------------------------------------------- general
  duration: {
    id: "duration", key: "duration", stage: "general",
    label: "How long have you noticed this problem?", type: "select",
    options: [
      { value: "less_than_week", label: "Less than a week" },
      { value: "1-2_weeks", label: "1–2 weeks" },
      { value: "2-4_weeks", label: "2–4 weeks" },
      { value: "1-3_months", label: "1–3 months" },
      { value: "3+_months", label: "More than 3 months" },
    ],
  },
  trend: {
    id: "trend", key: "trend", stage: "general",
    label: "Is it getting better, worse, or staying the same?", type: "select",
    options: [
      { value: "better", label: "Getting better" },
      { value: "same", label: "Staying the same" },
      { value: "worse", label: "Getting worse" },
    ],
  },
  severity_level: {
    id: "severity_level", key: "severity_level", stage: "general",
    label: "Overall, is the problem mild, moderate, or severe from your perspective?", type: "radio",
    options: [
      { value: "mild", label: "Mild" },
      { value: "moderate", label: "Moderate" },
      { value: "severe", label: "Severe" },
    ],
  },
  repeated_episodes: {
    id: "repeated_episodes", key: "repeated_episodes", stage: "general",
    label: "Has this happened before?", type: "radio",
    options: [
      { value: "no", label: "No, first time" },
      { value: "yes_once", label: "Yes, once before" },
      { value: "yes_recurring", label: "Yes, it keeps coming back" },
    ],
  },
  affected_areas: {
    id: "affected_areas", key: "affected_areas", stage: "general",
    label: "Is the problem affecting one area or multiple areas?", type: "radio",
    options: [
      { value: "single", label: "One area" },
      { value: "multiple", label: "Multiple areas" },
    ],
  },
  // ---------------------------------------------------------- scalp / hair
  itching: {
    id: "itching", key: "itching", stage: "scalp",
    label: "Do you have itching?", type: "radio",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
  },
  itching_severity: {
    id: "itching_severity", key: "itching_severity", stage: "scalp",
    label: "How severe is the itching?", type: "slider",
    min: 0, max: 10, min_label: "0 = None", max_label: "10 = Very severe",
    show_if: { itching: "yes" },
  },
  scalp_redness: {
    id: "scalp_redness", key: "scalp_redness", stage: "scalp",
    label: "Do you notice redness on the scalp?", type: "radio",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
  },
  scaling: {
    id: "scaling", key: "scaling", stage: "scalp",
    label: "How much scaling/flaking do you see?", type: "slider",
    min: 0, max: 10, min_label: "0 = None", max_label: "10 = Very severe",
  },
  dandruff_excess: {
    id: "dandruff_excess", key: "dandruff_excess", stage: "scalp",
    label: "Do you have excessive dandruff?", type: "radio",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
  },
  hair_fall: {
    id: "hair_fall", key: "hair_fall", stage: "scalp",
    label: "How much hair fall are you experiencing?", type: "slider",
    min: 0, max: 10, min_label: "0 = None", max_label: "10 = Very severe",
  },
  thinning_increase: {
    id: "thinning_increase", key: "thinning_increase", stage: "scalp",
    label: "Has hair thinning increased recently?", type: "radio",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
      { value: "unsure", label: "Not sure" },
    ],
  },
  scalp_pain: {
    id: "scalp_pain", key: "scalp_pain", stage: "scalp",
    label: "Is the scalp painful?", type: "radio",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
  },
  scalp_swelling: {
    id: "scalp_swelling", key: "scalp_swelling", stage: "scalp",
    label: "Is there any swelling?", type: "radio",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
  },
  scalp_burning: {
    id: "scalp_burning", key: "scalp_burning", stage: "scalp",
    label: "Is there burning or irritation?", type: "radio",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
  },
  spreading: {
    id: "spreading", key: "spreading", stage: "scalp",
    label: "Is the affected area spreading?", type: "radio",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
      { value: "unsure", label: "Not sure" },
    ],
  },
  shampoo_change: {
    id: "shampoo_change", key: "shampoo_change", stage: "scalp",
    label: "Have you recently changed shampoo or hair products?", type: "radio",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
  },
  styling_products: {
    id: "styling_products", key: "styling_products", stage: "scalp",
    label: "Do you frequently use hair styling products?", type: "radio",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
  },
  patchy_hair_loss: {
    id: "patchy_hair_loss", key: "patchy_hair_loss", stage: "scalp",
    label: "Have you noticed circular or patchy hair loss?", type: "radio",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
  },
  // ----------------------------------------------------------------- nails
  nail_location: {
    id: "nail_location", key: "nail_location", stage: "nails",
    label: "Which nails are affected?", type: "select",
    options: [
      { value: "fingernails", label: "Fingernails" },
      { value: "toenails", label: "Toenails" },
      { value: "both", label: "Both fingernails and toenails" },
    ],
  },
  nail_brittle: {
    id: "nail_brittle", key: "nail_brittle", stage: "nails",
    label: "Is the nail brittle or breaking easily?", type: "radio",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
  },
  nail_discoloration: {
    id: "nail_discoloration", key: "nail_discoloration", stage: "nails",
    label: "Is the nail changing color?", type: "radio",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
  },
  nail_thickening: {
    id: "nail_thickening", key: "nail_thickening", stage: "nails",
    label: "Is the nail becoming thicker?", type: "radio",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
  },
  nail_pain: {
    id: "nail_pain", key: "nail_pain", stage: "nails",
    label: "Is there pain in the affected nail?", type: "radio",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
  },
  nail_swelling: {
    id: "nail_swelling", key: "nail_swelling", stage: "nails",
    label: "Is there swelling around the nail?", type: "radio",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
  },
  nail_redness: {
    id: "nail_redness", key: "nail_redness", stage: "nails",
    label: "Is there redness around the nail?", type: "radio",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
  },
  nail_separation: {
    id: "nail_separation", key: "nail_separation", stage: "nails",
    label: "Is the nail separating from the skin?", type: "radio",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
  },
  nail_spreading: {
    id: "nail_spreading", key: "nail_spreading", stage: "nails",
    label: "Is the condition spreading to other nails?", type: "radio",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
  },
  // ------------------------------------------------------------- health
  diet_days_months: {
    id: "diet_days_months", key: "diet_days_months", stage: "health",
    label: "How many days/months have you been experiencing this?", type: "text",
    placeholder: "e.g. 3 months", optional: true,
  },
  diet_overall: {
    id: "diet_overall", key: "diet_overall", stage: "health",
    label: "How would you describe your overall diet?", type: "radio",
    options: [
      { value: "balanced", label: "Balanced" },
      { value: "mostly_balanced", label: "Mostly balanced" },
      { value: "irregular", label: "Irregular" },
      { value: "limited_variety", label: "Limited variety" },
    ],
  },
  diet_low_protein: {
    id: "diet_low_protein", key: "diet_low_protein", stage: "health",
    label: "Do you regularly eat protein-rich foods?", type: "radio",
    options: [
      { value: "yes", label: "Yes" },
      { value: "sometimes", label: "Sometimes" },
      { value: "no", label: "No" },
    ],
  },
  diet_vegetables: {
    id: "diet_vegetables", key: "diet_vegetables", stage: "health",
    label: "Do you regularly eat vegetables?", type: "radio",
    options: [
      { value: "yes", label: "Yes" },
      { value: "sometimes", label: "Sometimes" },
      { value: "no", label: "No" },
    ],
  },
  diet_fruits: {
    id: "diet_fruits", key: "diet_fruits", stage: "health",
    label: "Do you consume fruits?", type: "radio",
    options: [
      { value: "yes", label: "Yes" },
      { value: "sometimes", label: "Sometimes" },
      { value: "no", label: "No" },
    ],
  },
  diet_iron: {
    id: "diet_iron", key: "diet_iron", stage: "health",
    label: "Do you consume iron-rich foods?", type: "radio",
    options: [
      { value: "yes", label: "Yes" },
      { value: "sometimes", label: "Sometimes" },
      { value: "no", label: "No" },
    ],
  },
  diet_calcium: {
    id: "diet_calcium", key: "diet_calcium", stage: "health",
    label: "Do you consume dairy or other calcium sources?", type: "radio",
    options: [
      { value: "yes", label: "Yes" },
      { value: "sometimes", label: "Sometimes" },
      { value: "no", label: "No" },
    ],
  },
  water_intake: {
    id: "water_intake", key: "water_intake", stage: "health",
    label: "How much water do you usually drink per day?", type: "select",
    options: [
      { value: "<1L", label: "Less than 1 litre" },
      { value: "1-1.5L", label: "1 – 1.5 litres" },
      { value: "1.5-2L", label: "1.5 – 2 litres" },
      { value: "2L+", label: "2 litres or more" },
    ],
  },
  sleep_hours: {
    id: "sleep_hours", key: "sleep_hours", stage: "health",
    label: "How many hours do you sleep on average?", type: "select",
    options: [
      { value: "<5", label: "Less than 5 hours" },
      { value: "5-6", label: "5 – 6 hours" },
      { value: "6-8", label: "6 – 8 hours" },
      { value: "8+", label: "More than 8 hours" },
    ],
  },
  stress: {
    id: "stress", key: "stress", stage: "health",
    label: "Are you currently under significant stress?", type: "radio",
    options: [
      { value: "not_really", label: "Not really" },
      { value: "moderate", label: "A moderate amount" },
      { value: "high", label: "Yes, significant stress" },
    ],
  },
  chemical_products: {
    id: "chemical_products", key: "chemical_products", stage: "health",
    label: "Do you frequently use chemical hair or nail products?", type: "radio",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
    ],
  },
};

export const STAGE_ORDER = ["general", "area", "health"];

const AREA_RANK: Record<string, number> = {
  itching: 1, itching_severity: 2, scalp_redness: 3, scaling: 4,
  dandruff_excess: 5, hair_fall: 6, thinning_increase: 7,
  patchy_hair_loss: 8, spreading: 9, scalp_pain: 10, scalp_burning: 11,
  scalp_swelling: 12, shampoo_change: 13, styling_products: 14,
  nail_location: 15, nail_brittle: 16, nail_discoloration: 17,
  nail_thickening: 18, nail_separation: 19, nail_pain: 20,
  nail_swelling: 21, nail_redness: 22, nail_spreading: 23,
};

export function getQuestions(
  screeningType: string,
  stage: string,
  answers: Record<string, unknown> = {}
): Question[] {
  if (!STAGE_ORDER.includes(stage)) throw new Error("Unknown questionnaire stage");

  let sourceStages: string[];
  if (stage === "area") {
    if (screeningType === "nails") sourceStages = ["nails"];
    else if (screeningType === "combined") sourceStages = ["scalp", "nails"];
    else sourceStages = ["scalp"];
  } else {
    sourceStages = [stage];
  }

  const out: Question[] = [];
  for (const q of Object.values(QUESTION_BANK)) {
    if (!sourceStages.includes(q.stage)) continue;
    const sif = q.show_if;
    if (sif) {
      let shown = true;
      for (const [k, v] of Object.entries(sif)) {
        if (String(answers[k]) !== String(v)) shown = false;
      }
      if (!shown) continue;
    }
    out.push(q);
  }

  if (stage === "area") out.sort((a, b) => (AREA_RANK[a.id] ?? 0) - (AREA_RANK[b.id] ?? 0));
  return out;
}

function asBool(value: unknown): unknown {
  if (value === true || value === "True" || value === "true" || value === 1 || value === "1" || value === "yes" || value === "Yes") return true;
  if (value === false || value === "False" || value === "false" || value === 0 || value === "0" || value === "no" || value === "No") return false;
  return value;
}

const BOOL_KEYS = [
  "itching", "scalp_redness", "dandruff_excess", "scalp_pain",
  "scalp_swelling", "scalp_burning", "shampoo_change",
  "styling_products", "patchy_hair_loss", "nail_brittle",
  "nail_discoloration", "nail_thickening", "nail_pain",
  "nail_swelling", "nail_redness", "nail_separation",
  "nail_spreading", "chemical_products",
];

const NUMBER_KEYS = ["itching_severity", "scaling", "hair_fall"];

const WATER_MAP: Record<string, number> = { "<1L": 750, "1-1.5L": 1250, "1.5-2L": 1750, "2L+": 2250 };
const DIET_KEYS = [
  "diet_overall", "diet_low_protein", "diet_vegetables", "diet_fruits",
  "diet_iron", "diet_calcium", "water_intake", "sleep_hours",
  "stress", "chemical_products",
];

export function normalizeAnswers(
  rawAnswers: Record<string, unknown>
): { answers: Record<string, unknown>; diet: Record<string, unknown> } {
  const answers: Record<string, unknown> = { ...(rawAnswers || {}) };

  for (const k of BOOL_KEYS) {
    if (k in answers) answers[k] = asBool(answers[k]);
  }
  for (const k of NUMBER_KEYS) {
    if (k in answers && answers[k] !== null && answers[k] !== undefined && answers[k] !== "") {
      const n = Number(answers[k]);
      if (!Number.isNaN(n)) answers[k] = n;
    }
  }

  if (String(answers.diet_low_protein) === "No" || String(answers.diet_low_protein) === "no" || String(answers.diet_low_protein) === "False" || String(answers.diet_low_protein) === "false") {
    answers.diet_low_protein_flag = true;
  } else if (String(answers.diet_low_protein) === "Sometimes" || String(answers.diet_low_protein) === "sometimes") {
    answers.diet_sometimes_low_protein = true;
  }
  if ("water_intake" in answers) {
    answers.water_amount_ml = WATER_MAP[String(answers.water_intake)] ?? 0;
  }

  const diet: Record<string, unknown> = {};
  for (const k of DIET_KEYS) {
    if (k in answers) diet[k] = answers[k];
  }
  if (answers.diet_low_protein_flag) diet.diet_low_protein = "low";
  if (answers.water_amount_ml) diet.water_amount_ml = answers.water_amount_ml;

  return { answers, diet };
}