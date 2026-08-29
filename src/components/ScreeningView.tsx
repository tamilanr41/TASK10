"use client";

import { SeverityBadge, ConfidenceBar, ModeBadge } from "@/components/ui";
import { DoctorActions } from "@/components/DoctorActions";

export type Finding = {
  is_demo?: boolean;
  severity?: string;
  label?: string;
  confidence?: number;
  explanation?: string;
};

export type Findings = Record<string, Finding | null | undefined>;

export type NutritionInsight = {
  nutrient?: string;
  insight?: string;
  food_suggestions?: string[];
};

export type NutritionInsights = {
  insights?: NutritionInsight[];
  hydration?: { guidance?: string };
};

export type Recommendations = {
  severity_guidance?: string;
  general_precautions?: string[];
  home_care_suggestions?: string[];
  things_to_avoid?: string[];
  when_to_consult?: string[];
  non_prescriptive_note?: string;
};

export type Doctor = {
  id?: string | number;
  name?: string;
  specialization?: string;
  clinic?: string;
  location?: string;
  availability?: string;
  contact?: string;
  is_sample?: boolean;
};

export type DoctorRecommendation = {
  suggest_text?: string;
  matched?: Doctor[];
};

export type Screening = {
  id: string | number;
  created_at: string;
  screening_type: string;
  mode: string;
  overall_severity: string;
  overall_condition: string;
  summary_text: string;
  overall_confidence: number;
  predictions?: {
    findings?: Findings;
  };
  recommendations?: Recommendations;
  nutrition_insights?: NutritionInsights;
  doctor_recommendation?: DoctorRecommendation;
  symptoms?: unknown;
  diet_info?: Record<string, unknown>;
  scalp_image_path?: string | null;
  nail_image_path?: string | null;
};

export function FindingCard({
  kind,
  finding,
}: {
  kind: string;
  finding: Finding | null | undefined;
}) {
  if (!finding) return null;
  return (
    <div className="card">
      <div className="flex-between">
        <h4 style={{ textTransform: "capitalize" }}>{kind} finding</h4>
        <div className="flex-center">
          <ModeBadge isDemo={finding.is_demo} />
          <SeverityBadge severity={finding.severity} />
        </div>
      </div>
      <h3 className="mt-1">{finding.label}</h3>
      <ConfidenceBar value={finding.confidence} />
      {finding.explanation && <p className="small muted mt-2">{finding.explanation}</p>}
    </div>
  );
}

export function FindingsSection({ findings }: { findings?: Findings }) {
  const keys = Object.keys(findings || {});
  if (!keys.length) {
    return (
      <div className="alert alert-info">
        No specific pattern was identified from the information provided. This is
        not a diagnosis — continue monitoring and consult a professional if
        symptoms persist.
      </div>
    );
  }
  return (
    <div className="grid grid-2">
      {keys.map((k) => (
        <FindingCard key={k} kind={k} finding={findings ? findings[k] : null} />
      ))}
    </div>
  );
}

export function NutritionSection({
  nutrition,
}: {
  nutrition?: NutritionInsights | null;
}) {
  if (!nutrition) return null;
  return (
    <div className="card">
      <h3>Nutrition &amp; hydration considerations</h3>
      {(nutrition.insights || []).length === 0 && (
        <p className="small muted">
          No specific nutritional considerations were triggered by this screening.
        </p>
      )}
      {(nutrition.insights || []).map((ins) => (
        <div key={ins.nutrient} className="mt-2">
          <b>{ins.nutrient}</b>
          <p className="small muted">{ins.insight}</p>
          {ins.food_suggestions && ins.food_suggestions.length > 0 && (
            <p className="small">
              <span className="muted">General food suggestions: </span>
              {ins.food_suggestions.join(" · ")}
            </p>
          )}
        </div>
      ))}
      {nutrition.hydration?.guidance && (
        <div className="mt-2">
          <b>Hydration</b>
          <p className="small muted">{nutrition.hydration.guidance}</p>
        </div>
      )}
      <p className="small muted mt-2" style={{ fontStyle: "italic" }}>
        These are general wellness considerations, not a confirmed deficiency or
        a prescription.
      </p>
    </div>
  );
}

export function RecommendationsSection({
  rec,
}: {
  rec?: Recommendations | null;
}) {
  if (!rec) return null;
  return (
    <div className="card">
      <h3>Personalized recommendations</h3>
      <p className="small muted">{rec.severity_guidance}</p>
      {[
        { title: "General precautions", key: "general_precautions" as const },
        { title: "Home-care suggestions", key: "home_care_suggestions" as const },
        { title: "Things to avoid", key: "things_to_avoid" as const },
        { title: "When to consult a doctor", key: "when_to_consult" as const },
      ].map((g) => (
        <div key={g.key} className="mt-2">
          <b>{g.title}</b>
          <ul className="small">
            {(rec[g.key] || []).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
      <p className="small muted mt-2" style={{ fontStyle: "italic" }}>
        {rec.non_prescriptive_note}
      </p>
    </div>
  );
}

export function DoctorSection({
  docrec,
}: {
  docrec?: DoctorRecommendation | null;
}) {
  if (!docrec) return null;
  return (
    <div className="card">
      <h3>Doctor consultation recommendation</h3>
      <p className="small">{docrec.suggest_text}</p>
      {(docrec.matched || []).length > 0 ? (
        <div className="grid grid-2 mt-2">
          {(docrec.matched || []).map((d) => (
            <div key={`${d.name}-${d.id}`} className="card" style={{ boxShadow: "none" }}>
              <b>{d.name}</b>
              <p className="small muted">{d.specialization}</p>
              <p className="small">{d.clinic}</p>
              <p className="small muted">{d.location}</p>
              <p className="small">{d.availability}</p>
              <p className="small">{d.contact}</p>
              {d.is_sample && (
                <span className="badge badge-demo">Sample record</span>
              )}
              <DoctorActions name={d.name ?? ""} contact={d.contact} />
            </div>
          ))}
        </div>
      ) : (
        <p className="small muted">
          No matching sample doctors were found. Use the Doctors page to search by city.
        </p>
      )}
      <p className="small muted mt-2" style={{ fontStyle: "italic" }}>
        Doctor records in the prototype are sample entries, not verified listings.
      </p>
    </div>
  );
}