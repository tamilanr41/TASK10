"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers";
import { Disclosure } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";
import { Orbs, Reveal, Stagger, Item, CountUp, Tilt, Parallax, Magnetic, motion } from "@/components/motion";

const HERO_SLIDES = [
  { src: "/images/hero-scalp-exam.jpg", label: "scalp · live", conf: "94.2%" },
  { src: "/images/exam-advanced-tech.jpg", label: "analysis · running", conf: "91.7%" },
  { src: "/images/skin-exam-tablet.jpg", label: "review · reading", conf: "96.1%" },
  { src: "/images/clinic-consult.jpg", label: "consult · clinic", conf: "89.4%" },
];

function Hero() {
  const { user } = useAuth();
  const [idx, setIdx] = useState(0);

  return (
    <section className="hero-2 dark-bg">
      <Orbs seed={0} />
      <div className="container">
        <div className="hero-2-inner">
          <div>
            <Reveal>
              <span className="glass-chip">
                <span className="dot-live" style={{ color: "#34d399" }}>●</span> Multiport dermatological AI · v2.0
              </span>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 style={{ marginTop: "1.1rem" }}>
                Every screen, a <br className="brk" />
                <span className="dark-grad-text">new window</span> into your skin
              </h1>
            </Reveal>
            <Reveal delay={0.18}>
              <p className="lead mt-2">
                DermAI reads scalp, hair &amp; nail images with AI, blends them with your
                symptoms, and returns a cinematic screening summary — each screen designed
                to feel like a different instrument, all one lab.
              </p>
            </Reveal>
            <Reveal delay={0.26}>
              <div className="hero-2-cta">
                <Magnetic strength={0.22}>
                  <Link href={user ? "/screening" : "/signup"} className="btn btn-lg btn-dark-glow">
                    Start Screening →
                  </Link>
                </Magnetic>
                <Link href="/about" className="btn btn-lg btn-dark-ghost">
                  How it works
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.34}>
              <div className="hero-stats">
                {[
                  { v: 9, s: "", label: "AI modules" },
                  { v: 4, s: "", label: "analysis areas" },
                  { v: 100, s: "%", label: "data on-device aware" },
                  { v: 3, s: "s", label: "avg. screening" },
                ].map((st) => (
                  <div className="hero-stat" key={st.label}>
                    <div className="hero-stat-value">
                      <CountUp value={st.v} suffix={st.s} />
                    </div>
                    <div className="hero-stat-label">{st.label}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Stagger className="hero-2-visual" delay={0.15} gap={0.5}>
            <div style={{ position: "absolute", inset: 0 }}>
              <div className="hero-2-visual-ring" />
              {HERO_SLIDES.map((s, i) => (
                <motion.img
                  key={s.src}
                  src={s.src}
                  alt={s.label}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "88%",
                    height: "88%",
                    objectFit: "cover",
                    borderRadius: "46% 54% 58% 42% / 44% 46% 54% 56%",
                    border: "1px solid rgba(255,255,255,0.16)",
                    boxShadow: "0 34px 90px rgba(2,8,18,0.6)",
                    margin: "auto",
                    opacity: i === idx ? 1 : 0,
                    scale: i === idx ? 1 : 0.94,
                    zIndex: i === idx ? 2 : 1,
                  }}
                  animate={{ opacity: i === idx ? 1 : 0, scale: i === idx ? 1 : 0.94 }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                />
              ))}
              <motion.span
                className="hero-2-chip"
                style={{ bottom: "12%", zIndex: 5 }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
              >
                <span className="dot-live" style={{ color: "#34d399", marginRight: ".45rem" }}>●</span>
                {HERO_SLIDES[idx].label}
              </motion.span>
              <motion.span
                className="hero-2-chip"
                style={{ top: "6%", right: "0%", zIndex: 5 }}
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.15 }}
              >
                conf <b>{HERO_SLIDES[idx].conf}</b>
              </motion.span>
            </div>
          </Stagger>
        </div>
      </div>
    </section>
  );
}

const FEATURES: { icon: IconName; tone: string; title: string; text: string }[] = [
  { icon: "scalp", tone: "teal", title: "Scalp & Hair Analysis", text: "AI-assisted screening of dandruff, dry scalp, irritation, fungal possibilities and hair findings." },
  { icon: "nails", tone: "sky", title: "Nail Analysis", text: "Brittle nails, discoloration, fungal possibilities, separation and other nail findings." },
  { icon: "link", tone: "violet", title: "Multimodal Analysis", text: "Combine scalp, hair and nail findings with symptoms into one unified summary." },
  { icon: "quiz", tone: "amber", title: "Dynamic Questionnaire", text: "A doctor-like progressive interview that adapts to your answers and area." },
  { icon: "chat", tone: "green", title: "AI Chatbot Assistant", text: "Ask about scalp, hair, nail care, nutrition, hydration and understanding results." },
  { icon: "nutrition", tone: "rose", title: "Nutrition & Hydration", text: "General, non-prescriptive nutritional and hydration guidance." },
  { icon: "doctor", tone: "teal", title: "Doctor Recommendations", text: "Find dermatologists by location with tailored when-to-consult guidance." },
  { icon: "chart", tone: "sky", title: "Reports & Comparison", text: "Every screening saved with a PDF report and follow-up comparison." },
  { icon: "clock", tone: "violet", title: "Reminder Center", text: "Reminders for hydration, self-care, follow-up screenings and consultations." },
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
  return (
    <div>
      <Hero />

      {/* Workflow — light section, distinct visual language */}
      <section className="container page">
        <Reveal>
          <div className="center mb-1">
            <span className="kicker">Workflow</span>
          </div>
          <h2 className="center">How It Works</h2>
          <p className="center muted mb-3" style={{ maxWidth: 640, margin: "0 auto 1.5rem" }}>
            A guided, multi-step screening workflow that mirrors a structured preliminary consultation.
          </p>
        </Reveal>
        <Stagger className="stat-grid stagger">
          {STEPS.map((s) => (
            <Item key={s.n}>
              <Tilt className="card card-hover" max={7} style={{ height: "100%" }}>
                <div className="stat-value" style={{ fontSize: "1.1rem" }}>
                  {s.n}
                </div>
                <div style={{ fontWeight: 700 }}>{s.t}</div>
                <p className="small muted">{s.d}</p>
              </Tilt>
            </Item>
          ))}
        </Stagger>

        <hr className="section-divider" />

        <Reveal>
          <div className="center mb-1">
            <span className="kicker">Analysis Modules</span>
          </div>
          <h2 className="center">A Toolkit of Nine AI Instruments</h2>
          <p className="center muted mb-3">
            Demo/prototype engine today, architected for a real CNN (MobileNetV2) tomorrow — no rebuild required.
          </p>
        </Reveal>
        <Stagger className="feature-grid module-grid mt-2" gap={0.07}>
          {FEATURES.map((f) => (
            <Item key={f.title}>
              <Tilt className="feature-card" max={10} style={{ height: "100%" }}>
                <div className={`icon-tile ${TONE_CLASS[f.tone]}`}>
                  <Icon name={f.icon} size={24} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </Tilt>
            </Item>
          ))}
        </Stagger>

        <hr className="section-divider" />

        <Reveal>
          <div className="center mb-1">
            <span className="kicker">Real Dermatology</span>
          </div>
          <h2 className="center">A closer look at skin, scalp &amp; nails</h2>
          <p className="center muted mb-3" style={{ maxWidth: 640, margin: "0 auto 1.5rem" }}>
            DermAI works on the same areas a dermatologist examines — from dermoscopy views of lesions to hair and nail macro details.
          </p>
        </Reveal>
        <Stagger className="gallery derma-grid" gap={0.08}>
          {[
            { src: "/images/mole-closeup.jpg", cap: "Dermoscopic close-up of a skin lesion" },
            { src: "/images/curly-hair-scan.jpg", cap: "Hair &amp; scalp imaging" },
            { src: "/images/red-nails-leaf.jpg", cap: "Nail macro &amp; condition detail" },
            { src: "/images/back-moles.jpg", cap: "Full-skin lesion screening" },
            { src: "/images/laser-skin-treatment.jpg", cap: "In-clinic skin treatment" },
            { src: "/images/scientist-microscope.jpg", cap: "Microscopy &amp; lab analysis" },
          ].map((g, i) => (
            <Item key={g.src}>
              <Parallax speed={(i % 2 === 0 ? 1 : -1) * 0.08} className="gallery-item" style={{ height: "100%" }}>
                <figure className="gallery-item gallery-item-inner" style={{ margin: 0 }}>
                  <img src={g.src} alt={g.cap} loading="lazy" />
                  <figcaption>{g.cap}</figcaption>
                </figure>
              </Parallax>
            </Item>
          ))}
        </Stagger>

        <Disclosure />
      </section>
    </div>
  );
}