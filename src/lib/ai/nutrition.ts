type NutritionProfile = {
  nutrient: string;
  trigger_findings: string[];
  trigger_symptoms: string[];
  insight: string;
  food_suggestions: string[];
};

const NUTRITION_PROFILES: Record<string, NutritionProfile> = {
  iron: {
    nutrient: "Iron",
    trigger_findings: ["hair_thinning", "excessive_hair_fall", "hair_fall"],
    trigger_symptoms: ["iron_diet_low", "diet_low_protein"],
    insight:
      "Some symptoms can sometimes be associated with nutritional factors such as iron status. Consider discussing iron testing with a qualified healthcare professional if appropriate.",
    food_suggestions: [
      "Leafy green vegetables",
      "Lentils and beans",
      "Fortified foods",
      "Iron-rich dietary sources appropriate for your eating pattern",
    ],
  },
  b12: {
    nutrient: "Vitamin B12",
    trigger_findings: ["hair_thinning", "excessive_hair_fall", "nail_discoloration"],
    trigger_symptoms: ["diet_low_animal", "iron_diet_low"],
    insight:
      "Some symptoms can sometimes be associated with nutritional factors such as Vitamin B12 status. Consider discussing testing with a qualified healthcare professional if appropriate.",
    food_suggestions: [
      "Eggs",
      "Dairy products",
      "Fortified foods",
      "Appropriate animal-based foods according to your eating pattern",
    ],
  },
  vitamin_d: {
    nutrient: "Vitamin D",
    trigger_findings: ["hair_thinning", "dry_scalp", "scalp_irritation"],
    trigger_symptoms: ["sun_exposure_low"],
    insight:
      "Some symptoms can sometimes be associated with nutritional factors such as Vitamin D status. Consider discussing testing with a qualified healthcare professional if appropriate.",
    food_suggestions: [
      "Fortified foods",
      "Dietary sources of vitamin D",
      "Safe, sensible sunlight exposure where appropriate",
    ],
  },
  biotin: {
    nutrient: "Biotin",
    trigger_findings: ["hair_thinning", "brittle_nails", "nail_separation"],
    trigger_symptoms: [],
    insight:
      "Some symptoms can sometimes be associated with nutritional factors such as biotin status. Consider discussing testing with a qualified healthcare professional if appropriate.",
    food_suggestions: [
      "Eggs",
      "Nuts and seeds",
      "Legumes",
      "A balanced diet with a variety of whole foods",
    ],
  },
  protein: {
    nutrient: "Protein",
    trigger_findings: ["hair_thinning", "excessive_hair_fall", "brittle_nails"],
    trigger_symptoms: ["diet_low_protein", "iron_diet_low"],
    insight:
      "Adequate protein is part of a generally balanced diet that supports hair and nail health. If your protein intake is consistently low, this could be a possible consideration to review with a qualified professional.",
    food_suggestions: [
      "Eggs",
      "Milk and yogurt",
      "Lentils and beans",
      "Soy products",
      "Nuts and seeds",
    ],
  },
};

const GENERAL_NUTRITION_INSIGHT = {
  nutrient: "General balanced nutrition",
  insight:
    "A variety of whole foods supports general wellness. There is no single food or nutrient that guarantees hair, scalp or nail health.",
  food_suggestions: [
    "Vegetables and fruits",
    "Whole grains",
    "Protein sources appropriate for your eating pattern",
    "Adequate hydration",
  ],
};

const HYDRATION_GUIDANCE =
  "Maintaining adequate hydration is important for general health. Individual water needs vary depending on factors such as activity, climate, diet, and health status.";

const TRIGGER_VALUES = ["Yes", "yes", "true", "low", "never", "rarely", "1"];

export function runNutrition(
  findings: Record<string, Record<string, unknown>>,
  symptoms: Record<string, unknown>,
  dietInfo: Record<string, unknown>
): Record<string, unknown> {
  const active: Array<Record<string, unknown>> = [];
  const findingKeys = new Set(Object.values(findings).map((f) => String(f.key)));

  for (const profile of Object.values(NUTRITION_PROFILES)) {
    const triggeredByFinding = profile.trigger_findings.some((k) => findingKeys.has(k));
    let triggeredBySymptom = false;
    for (const sym of profile.trigger_symptoms) {
      const val = dietInfo[sym];
      if (val === true || val === 1 || (val !== undefined && TRIGGER_VALUES.includes(String(val)))) {
        triggeredBySymptom = true;
      }
    }
    if (!(triggeredByFinding || triggeredBySymptom)) continue;
    active.push({
      nutrient: profile.nutrient,
      insight: profile.insight,
      food_suggestions: profile.food_suggestions,
      triggered_by_finding: triggeredByFinding,
      triggered_by_symptom: triggeredBySymptom,
    });
  }

  const waterMl = Number(dietInfo.water_amount_ml || 0);
  let hydration = HYDRATION_GUIDANCE;
  let hydrationLevel = "general";
  if (waterMl > 0 && waterMl < 1000) {
    hydrationLevel = "below_typical";
    hydration =
      HYDRATION_GUIDANCE +
      " Your reported intake appears below a typical personal range; gradually increasing warm water intake and discussing it with a professional are reasonable general steps.";
  } else if (waterMl >= 2000) {
    hydrationLevel = "within_typical";
  }

  return {
    insights: active,
    general: GENERAL_NUTRITION_INSIGHT,
    hydration: {
      guidance: hydration,
      level: hydrationLevel,
      reported_ml: waterMl ? waterMl : null,
    },
  };
}