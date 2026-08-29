"use client";

import { Disclosure, Kicker } from "@/components/ui";
import Reveal from "@/components/Reveal";

export default function AboutPage() {
  return (
    <div className="container page">
      <Kicker>About the system</Kicker>
      <h1 className="page-title mt-2">About DermAI</h1>
      <p className="page-sub">
        AI-Driven Multimodal Dermatological Screening System
      </p>

      <div className="cutout-blob mb-3 float-soft" style={{ maxWidth: 720, aspectRatio: "16 / 9", marginLeft: "auto", marginRight: "auto" }}>
        <img
          src="/images/exam-advanced-tech.jpg"
          alt="Advanced technology skin examination"
          className="kenburns"
          style={{ height: "100%" }}
        />
      </div>

      <Reveal>
      <div className="grid grid-2">
        <div className="card">
          <h3>What is DermAI?</h3>
          <p className="small">
            DermAI is a full-stack, AI-assisted preliminary dermatological
            screening platform focused on scalp &amp; hair and nail analysis. It
            combines computer-vision image analysis with a structured dynamic
            symptom questionnaire to produce educational screening summaries.
          </p>
          <h3 className="mt-2">Primary focus areas</h3>
          <ul className="small">
            <li>Scalp &amp; hair: dandruff, dry scalp, irritation, thinning, possible fungal scalp condition</li>
            <li>Nails: brittle nails, discoloration, possible fungal nail condition</li>
            <li>Combined scalp/hair + nail analysis in a single multimodal screening</li>
          </ul>
        </div>

        <div className="card">
          <h3>How the screening works</h3>
          <ol className="small">
            <li>You select a screening area (scalp/hair, nails, or both).</li>
            <li>You upload valid images – validated for type, size and readability.</li>
            <li>The AI engine produces an initial image analysis.</li>
            <li>A dynamic doctor-like questionnaire asks only relevant questions.</li>
            <li>A multimodal engine fuses image + symptom + context into one result.</li>
            <li>You receive possible findings, confidence, severity, nutrition
                considerations, general recommendations and doctor guidance.</li>
            <li>A PDF report is generated and saved to your history.</li>
          </ol>
        </div>
      </div>
      </Reveal>

      <Reveal delay={80}>
      <div className="card mt-3">
        <h3>Multimodal architecture</h3>
        <p className="small muted" style={{ fontFamily: "var(--mono)" }}>
          Image → Preprocessing → CNN → Image prediction
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
          isolated behind a single router, so a trained <b>MobileNetV2 CNN</b> can be
          dropped in later by adding a model file and its label map –
          with no changes to the rest of the application.
        </p>
      </div>
      </Reveal>

      <Reveal delay={120}>
      <div className="grid grid-2 mt-3">
        <div className="card">
          <h3>Tech stack</h3>
          <ul className="small">
            <li>Platform: Next.js 14 (App Router) · React 18 · TypeScript</li>
            <li>Data: SQLite via better-sqlite3 · jwt (httpOnly cookie auth)</li>
            <li>Auth: bcrypt password hashing + JWT session</li>
            <li>AI layer: isolated predictor router (demo ↔ real CNN)</li>
            <li>Reports: pdf-lib (PDF) with full disclaimer</li>
            <li>Styling: hand-crafted DERMA//LAB design system (no UI kit)</li>
          </ul>
        </div>

        <div className="card">
          <h3>Important limitation</h3>
          <Disclosure />
          <p className="small muted mt-2">
            Severity labels (Low / Moderate / High) are AI-estimated likelihood
            tiers for guidance only. Comparisons across screenings do not
            establish clinical improvement or worsening.
          </p>
        </div>
      </div>
      </Reveal>
    </div>
  );
}