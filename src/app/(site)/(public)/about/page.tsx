"use client";

import { Disclosure, Kicker } from "@/components/ui";
import Reveal from "@/components/Reveal";

export default function AboutPage() {
  return (
    <div className="container page">
      <Kicker>About the system</Kicker>
      <h1 className="page-title mt-2">About DermAI</h1>
      <p className="page-sub">
        AI-Assisted Multimodal Screening Platform
      </p>

      <Reveal>
      <div className="grid grid-2">
        <div className="card">
          <h3>What is DermAI?</h3>
          <p className="small">
            DermAI is an AI-assisted multimodal screening platform. It combines
            image-based analysis with a structured dynamic questionnaire and a
            fusion engine to produce clear, preliminary screening summaries for
            educational and demonstration purposes.
          </p>
          <h3 className="mt-2">Core capabilities</h3>
          <ul className="small">
            <li>Image upload, validation and preprocessing</li>
            <li>Initial AI-based image analysis</li>
            <li>Adaptive symptom questionnaire</li>
            <li>Multimodal fusion of image, symptoms and context</li>
            <li>Generated reports and result history</li>
          </ul>
        </div>

        <div className="card">
          <h3>How the screening works</h3>
          <ol className="small">
            <li>You select a screening area.</li>
            <li>You upload valid images – validated for type, size and readability.</li>
            <li>The AI engine produces an initial image analysis.</li>
            <li>A dynamic questionnaire asks only relevant questions.</li>
            <li>A multimodal engine fuses image + symptom + context into one result.</li>
            <li>You receive possible findings, confidence, severity, nutrition
                considerations, general recommendations and guidance.</li>
            <li>A PDF report is generated and saved to your history.</li>
          </ol>
        </div>
      </div>
      </Reveal>

      <Reveal delay={80}>
      <div className="card mt-3">
        <h3>System architecture</h3>
        <p className="small muted" style={{ fontFamily: "var(--mono)" }}>
          Image → Preprocessing → Model → Image prediction
        </p>
        <p className="small muted" style={{ fontFamily: "var(--mono)" }}>
          Symptom answers → Feature extraction
        </p>
        <p className="small muted" style={{ fontFamily: "var(--mono)" }}>
          Multimodal fusion → Condition · Confidence · Severity · Explanation · Recommendations
        </p>
        <p className="small mt-2">
          The current build runs a deterministic <b>Demo / Prototype AI engine</b> so
          the entire workflow is demonstrable and testable. The prediction layer is
          isolated behind a single router, so a trained model can be dropped in later
          by adding a model file and its label map – with no changes to the rest of
          the application.
        </p>
      </div>
      </Reveal>

      <Reveal delay={120}>
      <div className="card mt-3">
        <h3>Important limitation</h3>
        <Disclosure />
        <p className="small muted mt-2">
          Severity labels (Low / Moderate / High) are AI-estimated likelihood
          tiers for guidance only. Comparisons across screenings do not
          establish clinical improvement or worsening.
        </p>
      </div>
      </Reveal>
    </div>
  );
}