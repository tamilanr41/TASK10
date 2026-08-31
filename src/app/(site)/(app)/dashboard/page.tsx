"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/components/providers";
import { Spinner, SeverityBadge } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";
import { PageFade, Reveal, Stagger, Item, CountUp, Tilt } from "@/components/motion";
import type { Screening } from "@/components/ScreeningView";

const QUICK: { to: string; label: string; icon: IconName; tone: string }[] = [
  { to: "/screening", label: "Start New Screening", icon: "doctor", tone: "teal" },
  { to: "/screening?type=scalp", label: "Scalp & Hair Analysis", icon: "scalp", tone: "sky" },
  { to: "/screening?type=nails", label: "Nail Analysis", icon: "nails", tone: "violet" },
  { to: "/history", label: "View History", icon: "chart", tone: "amber" },
  { to: "/chat", label: "Chat with DermAI", icon: "chat", tone: "green" },
  { to: "/doctors", label: "Find a Doctor", icon: "hospital", tone: "rose" },
  { to: "/nutrition", label: "Nutrition Insights", icon: "nutrition", tone: "teal" },
  { to: "/reminders", label: "Reminders", icon: "clock", tone: "sky" },
];

const TONE_CLASS: Record<string, string> = {
  teal: "feature-icon-teal",
  sky: "feature-icon-sky",
  violet: "feature-icon-violet",
  amber: "feature-icon-amber",
  rose: "feature-icon-rose",
  green: "feature-icon-green",
};

type DashboardData = {
  stats: { total: number; low: number; moderate: number; high: number };
  recent: Screening[];
  latest: Screening | null;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<DashboardData>("/api/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="container page"><div className="alert alert-danger">{error}</div></div>;
  if (!data) return <div className="container page"><Spinner /></div>;

  const { stats, recent } = data;
  const first = (user?.name || "there").split(" ")[0];

  const statCards = [
    { n: "Total screenings", v: stats.total },
    { n: "Low severity", v: stats.low },
    { n: "Moderate severity", v: stats.moderate },
    { n: "High severity", v: stats.high },
  ];

  return (
    <PageFade>
      <div className="container page">
        <Reveal>
          <div className="dash-hero">
            <div className="dash-hero-inner">
              <div>
                <span className="glass-chip">
                  <span className="dot-live" style={{ color: "#34d399" }}>●</span> Dashboard · synced
                </span>
                <h1 className="dash-hero-title">Welcome back, {first}</h1>
                <p className="dash-hero-sub">
                  Here is an overview of your screenings and health journey.
                </p>
                <Link href="/screening" className="btn btn-primary btn-dark-glow mt-2">Start New Screening</Link>
              </div>
              <img className="dash-hero-img" src="/images/clinic-consult.jpg" alt="Hair and nail consultation" />
            </div>
          </div>
        </Reveal>

        <Stagger className="stat-grid mb-3" gap={0.08}>
          <Item key="!stat-total" className="stat-card">
            <div className="stat-label">Total screenings</div>
            <div className="stat-value"><CountUp value={stats.total} /></div>
          </Item>
          <Item key="!stat-low" className="stat-card stat-card-low">
            <div className="stat-label">Low severity</div>
            <div className="stat-value stat-low"><CountUp value={stats.low} /></div>
          </Item>
          <Item key="!stat-mod" className="stat-card stat-card-mod">
            <div className="stat-label">Moderate severity</div>
            <div className="stat-value stat-mod"><CountUp value={stats.moderate} /></div>
          </Item>
          <Item key="!stat-high" className="stat-card stat-card-high">
            <div className="stat-label">High severity</div>
            <div className="stat-value stat-high"><CountUp value={stats.high} /></div>
          </Item>
        </Stagger>

        <Reveal>
          <h2 className="section-title">Quick Actions</h2>
        </Reveal>
        <Stagger className="feature-grid" gap={0.06}>
          {QUICK.map((q) => (
            <Item key={q.label}>
              <Tilt className="feature-card" max={8} style={{ height: "100%" }}>
                <Link href={q.to} className="feature-card-link">
                  <div className={`icon-tile ${TONE_CLASS[q.tone]}`}>
                    <Icon name={q.icon} size={24} />
                  </div>
                  <h3>{q.label}</h3>
                </Link>
              </Tilt>
            </Item>
          ))}
        </Stagger>

        <Reveal>
          <h2 className="section-title">Recent Screenings</h2>
        </Reveal>
        {recent.length === 0 ? (
          <Reveal>
            <div className="empty-state card">
              <h3>No screenings yet</h3>
              <p className="small muted">Start your first screening to see results here.</p>
              <Link className="btn btn-primary mt-2" href="/screening">Start Screening</Link>
            </div>
          </Reveal>
        ) : (
          <Reveal>
            <div className="card table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Possible condition</th>
                    <th>Confidence</th>
                    <th>Severity</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((s) => (
                    <tr key={s.id}>
                      <td>{s.created_at}</td>
                      <td className="muted">{s.screening_type}</td>
                      <td>{s.overall_condition}</td>
                      <td>{(s.overall_confidence * 100).toFixed(0)}%</td>
                      <td><SeverityBadge severity={s.overall_severity} /></td>
                      <td><Link className="btn btn-secondary btn-sm" href={`/history/${s.id}`}>View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        )}

        {data.latest && (
          <>
            <Reveal>
              <h2 className="section-title">Latest Result</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="card latest-card">
                <div className="flex-between">
                  <div>
                    <div className="muted small">{data.latest.created_at} · {data.latest.screening_type} screening</div>
                    <h3 className="mt-1">{data.latest.overall_condition}</h3>
                    <div className="flex-center mt-1">
                      <SeverityBadge severity={data.latest.overall_severity} />
                      <span className="small muted">Confidence {(data.latest.overall_confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <Link className="btn btn-secondary" href={`/history/${data.latest.id}`}>View Details</Link>
                </div>
              </div>
            </Reveal>
          </>
        )}
      </div>
    </PageFade>
  );
}