"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers";
import { Disclosure, Kicker } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";
import Reveal from "@/components/Reveal";

const HERO_SLIDES = [
  { src: "/images/hero-scalp-exam.jpg", label: "scalp · live", conf: "conf 94.2%", alt: "Scalp examination being performed" },
  { src: "/images/exam-advanced-tech.jpg", label: "analysis · running", conf: "conf 91.7%", alt: "Advanced skin screening session" },
  { src: "/images/skin-exam-tablet.jpg", label: "review · reading", conf: "conf 96.1%", alt: "Dermatologist previewing skin analysis" },
  { src: "/images/clinic-consult.jpg", label: "consult · clinic", conf: "conf 89.4%", alt: "Skin consultation in clinic" },
];

function HeroVisual() {
  const [idx, setIdx] = useState(0);
  const [fromScroll, setFromScroll] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let t = 0;
    const advance = (i: number) => setIdx((p) => (p + i) % HERO_SLIDES.length);
    t = window.setTimeout(() => { setFromScroll(false); advance(1); }, 5200);
    const onScroll = () => {
      const el = heroRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const h = Math.max(window.innerHeight, 1);
      const progress = Math.max(0, Math.min(1, -r.top / (r.height + h * 0.5)));
      const next = Math.min(HERO_SLIDES.length - 1, Math.floor(progress * HERO_SLIDES.length));
      if (next !== idx && (document.scrollingElement?.scrollTop ?? 0) > 4) {
        setFromScroll(true);
        advance(1);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
    };
  }, [idx]);

  const active = HERO_SLIDES[idx];

  return (
    <div className="hero-visual" ref={heroRef}>
      <div className="hero-visual-track">
        {HERO_SLIDES.map((s, i) => (
          <img
            key={s.src}
            src={s.src}
            alt={s.alt}
            loading={i === 0 ? "eager" : "lazy"}
            className={`${i === idx ? "is-active" : ""} ${fromScroll && i === idx ? "fx-in" : ""}`}
          />
        ))}
      </div>
      <div className="hero-visual-ring" aria-hidden="true" />
      <div className="hero-visual-west" aria-hidden="true" />
      <div className="hero-visual-south" aria-hidden="true" />
      <span className="hud-chip" style={{ top: "1.1rem", left: "1.1rem" }}>
        <span className="dot dot-live" /> {active.label}
      </span>
      <span className="hud-chip" style={{ bottom: "1.2rem", right: "1.1rem" }}>
        {active.conf}
      </span>
      <div className="hero-visual-dots" role="tablist" aria-label="Hero images">
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.src}
            role="tab"
            aria-selected={i === idx}
            aria-label={s.alt}
            className={i === idx ? "is-active" : ""}
            onClick={() => { setFromScroll(false); setIdx(i); }}
          />
        ))}
      </div>
    </div>
  );
}

const FEATURES: { icon: IconName; tone: string; title: string; text: string }[] = [
  {
    icon: "scalp",
    tone: "teal",
    title: "Scalp & Hair Analysis",
    text: "Upload a scalp image for AI-assisted screening of dandruff, dry scalp, irritation, fungal possibilities and hair-related findings.",
  },
  {
    icon: "nails",
    tone: "sky",
    title: "Nail Analysis",
    text: "Analyze nail images for brittle nails, discoloration, fungal possibilities, separation and other nail findings.",
  },
  {
    icon: "link",
    tone: "violet",
    title: "Multimodal Analysis",
    text: "Combine scalp, hair and nail findings with symptom answers into one unified screening summary.",
  },
  {
    icon: "quiz",
    tone: "amber",
    title: "Dynamic Questionnaire",
    text: "A doctor-like progressive interview that adapts its questions to your answers and screening area.",
  },
  {
    icon: "chat",
    tone: "green",
    title: "AI Chatbot Assistant",
    text: "Ask the DermAI Assistant about scalp, hair, nail care, nutrition, hydration and understanding results.",
  },
  {
    icon: "nutrition",
    tone: "rose",
    title: "Nutrition & Hydration",
    text: "Receive general, non-prescriptive nutritional considerations and hydration guidance.",
  },
  {
    icon: "doctor",
    tone: "teal",
    title: "Doctor Recommendations",
    text: "Find dermatologists by location and access tailored when-to-consult guidance.",
  },
  {
    icon: "chart",
    tone: "sky",
    title: "Screening History & Reports",
    text: "Every screening is saved with a downloadable PDF report and follow-up comparison.",
  },
  {
    icon: "clock",
    tone: "violet",
    title: "Reminder Center",
    text: "Create reminders for hydration, self-care, follow-up screenings and consultations.",
  },
];

const STEPS = [
  { n: "01", t: "Select area", d: "Choose scalp/hair, nails, or both." },
  { n: "02", t: "Upload images", d: "Add a valid scalp and/or nail photo." },
  { n: "03", t: "Answer symptoms", d: "Progressive doctor-like questions." },
  { n: "04", t: "Get results", d: "AI-estimated likelihoods, severity and guidance." },
];

const TONE_CLASS: Record<string, string> = {
  teal: "feature-icon-teal",
  sky: "feature-icon-sky",
  violet: "feature-icon-violet",
  amber: "feature-icon-amber",
  rose: "feature-icon-rose",
  green: "feature-icon-green",
};

export default function HomePage() {
  const { user } = useAuth();
  return (
    <div>
      <section className="hero">
        <div className="container">
          <div className="hero-inner">
            <div>
              <Kicker>Dermatological Screening System</Kicker>
              <h1 className="mt-2">
                Your skin, <span className="glow-text">kindly</span> read by
                artificial intelligence
              </h1>
              <p>
                DermAI analyzes scalp, hair and nail images, combines them with
                your symptoms, and produces an educational screening summary –
                never a diagnosis.
              </p>
              <div className="hero-cta">
                <Link
                  href={user ? "/screening" : "/signup"}
                  className="btn btn-primary hero-btn"
                >
                  Start Screening →
                </Link>
                <Link href="/about" className="btn hero-ghost">
                  How it works
                </Link>
              </div>
            </div>
            <HeroVisual />
          </div>
        </div>
      </section>

      <section className="container page">
        <div className="center mb-3">
          <Kicker>Workflow</Kicker>
        </div>
        <h2 className="center">How It Works</h2>
        <p className="center muted mb-3" style={{ maxWidth: 640, margin: "0 auto 1.5rem" }}>
          A guided, multi-step screening workflow that mirrors a structured
          preliminary consultation.
        </p>
        <div className="stat-grid stagger">
          {STEPS.map((s) => (
            <div className="card card-hover" key={s.n}>
              <div className="stat-value" style={{ fontSize: "1.1rem" }}>
                {s.n}
              </div>
              <div style={{ fontWeight: 700 }}>{s.t}</div>
              <p className="small muted">{s.d}</p>
            </div>
          ))}
        </div>

        <hr className="section-divider" />

        <div className="center mb-3">
          <Kicker>Analysis Modules</Kicker>
        </div>
        <h2 className="center">AI-Powered Analysis Modules</h2>
        <p className="center muted mb-3">
          Demo/prototype engine today, architected for a real CNN (MobileNetV2)
          tomorrow – no rebuild required.
        </p>
        <div className="feature-grid stagger mt-2">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className={`icon-tile ${TONE_CLASS[f.tone]}`}>
                <Icon name={f.icon} size={24} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>

        <hr className="section-divider" />

        <div className="grid grid-2">
          <div className="card">
            <h3>Multi-condition support</h3>
            <p className="muted small">
              One screening can surface several possible findings at once. For
              example, a combined screening can report a scalp finding, a
              hair-related finding and a nail finding together, each with its own
              AI-estimated confidence and severity – followed by one overall
              screening summary.
            </p>
          </div>
          <div className="card">
            <h3>Built to grow</h3>
            <p className="muted small">
              The prediction layer is isolated behind a single router. A trained
              CNN can be dropped in later by adding a model file and its label
              map – with no changes to the rest of the application.
            </p>
          </div>
        </div>

        <div className="cutout-blob mt-3" style={{ maxWidth: 700, aspectRatio: "16 / 9", marginLeft: "auto", marginRight: "auto" }}>
          <img src="/images/skin-exam-tablet.jpg" alt="Dermatologist previewing skin analysis" style={{ height: "100%" }} />
        </div>

        <hr className="section-divider" />

        <div className="center mb-3">
          <Kicker>Real Dermatology</Kicker>
        </div>
        <h2 className="center">A closer look at skin, scalp &amp; nails</h2>
        <p className="center muted mb-3" style={{ maxWidth: 640, margin: "0 auto 1.5rem" }}>
          DermAI works on the same areas a dermatologist examines — from
          dermoscopy views of lesions to hair and nail macro details.
        </p>
        <Reveal>
          <div className="gallery">
            {[
              { src: "/images/mole-closeup.jpg", cap: "Dermoscopic close-up of a skin lesion" },
              { src: "/images/curly-hair-scan.jpg", cap: "Hair &amp; scalp imaging" },
              { src: "/images/red-nails-leaf.jpg", cap: "Nail macro &amp; condition detail" },
              { src: "/images/back-moles.jpg", cap: "Full-skin lesion screening" },
              { src: "/images/laser-skin-treatment.jpg", cap: "In-clinic skin treatment" },
              { src: "/images/scientist-microscope.jpg", cap: "Microscopy &amp; lab analysis" },
            ].map((g) => (
              <figure className="gallery-item" key={g.src}>
                <img src={g.src} alt={g.cap} loading="lazy" />
                <figcaption>{g.cap}</figcaption>
              </figure>
            ))}
          </div>
        </Reveal>

        <Disclosure />
      </section>
    </div>
  );
}