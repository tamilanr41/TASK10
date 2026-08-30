"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BackLink } from "@/components/ui";
import { PageFade, Reveal, Stagger, Item } from "@/components/motion";

type NutritionInsight = {
  nutrient: string;
  insight?: string;
  food_suggestions?: string[];
};

type NutritionInsightsData = {
  insights?: NutritionInsight[];
  general?: {
    insight?: string;
    food_suggestions?: string[];
  };
};

type Screening = {
  id: number;
  nutrition_insights?: NutritionInsightsData;
};

type HistoryResponse = {
  screenings: Screening[];
};

export default function NutritionPage() {
  const [latest, setLatest] = useState<Screening | null>(null);
  const [err, setErr] = useState("");
  const [water, setWater] = useState("1-1.5L");
  const [hydration, setHydration] = useState("");

  useEffect(() => {
    api<HistoryResponse>("/api/history")
      .then((d) => {
        if (d.screenings.length) setLatest(d.screenings[0]);
      })
      .catch(() => {});
  }, []);

  const nutrition = latest?.nutrition_insights;
  const insights = nutrition?.insights || [];

  const showRecommendation = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const map: Record<string, string> = {
      "<1L": "Your reported intake appears below a typical personal range. Gradually increasing warm water intake and discussing it with a professional are reasonable general steps. Hydration should not be used to self-treat a dermatological condition.",
      "1-1.5L": "A moderate intake. Maintain consistent hydration and listen to your body’s needs across activity and climate.",
      "1.5-2L": "A typical range for many people. Continue according to your personal needs.",
      "2L+": "Good general intake. Continue meeting your personal needs based on activity, climate and health status.",
    };
    setHydration(map[water]);
  };

  if (err) return <div className="container page"><div className="alert alert-danger">{err}</div></div>;

  return (
    <PageFade>
      <div className="container page">
        <BackLink to="/dashboard" label="Back to Dashboard" />
        <h1 className="page-title mt-2">Nutrition &amp; Vitamin Insights</h1>
        <p className="page-sub">
          Possible nutritional considerations based on your latest screening. Never a
          confirmed deficiency and never a prescription.
        </p>

        {!latest ? (
          <Reveal>
            <div className="empty-state card">
              <h3>No screening data yet</h3>
              <p className="small muted">Complete a screening first to receive tailored considerations.</p>
            </div>
          </Reveal>
        ) : (
          <>
            <Reveal>
              <div className="card mb-3">
                <h3>Considerations from your latest screening (#{latest.id})</h3>
                {insights.length === 0 ? (
                  <p className="small muted">
                    No specific nutritional considerations were triggered by your screening.
                  </p>
                ) : (
                  <Stagger gap={0.08}>
                    {insights.map((ins) => (
                      <Item key={ins.nutrient} className="nutri-card">
                        <b>{ins.nutrient}</b>
                        <p className="small">{ins.insight}</p>
                        {ins.food_suggestions && ins.food_suggestions.length > 0 && (
                          <p className="small">
                            <span className="muted">General food suggestions: </span>
                            {ins.food_suggestions.join(" · ")}
                          </p>
                        )}
                      </Item>
                    ))}
                  </Stagger>
                )}
              </div>
            </Reveal>

            <Reveal>
              <div className="card mb-3">
                <h3>General balanced nutrition</h3>
                <p className="small muted">{nutrition?.general?.insight}</p>
                {nutrition?.general?.food_suggestions && (
                  <p className="small">{(nutrition?.general?.food_suggestions || []).join(" · ")}</p>
                )}
              </div>
            </Reveal>
          </>
        )}

        <Reveal>
          <div className="card">
            <h3>Hydration guidance</h3>
            <form onSubmit={showRecommendation}>
              <div className="field">
                <label htmlFor="water">How much water do you usually drink per day?</label>
                <select id="water" className="select" value={water} onChange={(e) => setWater(e.target.value)}>
                  <option value="<1L">Less than 1 litre</option>
                  <option value="1-1.5L">1 – 1.5 litres</option>
                  <option value="1.5-2L">1.5 – 2 litres</option>
                  <option value="2L+">2 litres or more</option>
                </select>
              </div>
              <button className="btn btn-secondary" type="submit">Show general guidance</button>
            </form>
            {hydration && (
              <div className="alert alert-teal mt-2">{hydration}</div>
            )}
            <p className="small muted mt-2">
              Maintaining adequate hydration is important for general health.
              Individual water needs vary depending on activity, climate, diet and
              health status. Water intake is not a treatment for any condition.
            </p>
            <p className="small muted" style={{ fontStyle: "italic" }}>
              DermAI never claims a confirmed vitamin deficiency or prescription.
            </p>
          </div>
        </Reveal>
      </div>
    </PageFade>
  );
}