"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/components/providers";
import { Spinner, StatCard, SeverityBadge } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";
import type { Screening } from "@/components/ScreeningView";

const QUICK: { to: string; label: string; icon: IconName }[] = [
  { to: "/screening", label: "Start New Screening", icon: "doctor" },
  { to: "/screening?type=scalp", label: "Scalp & Hair Analysis", icon: "scalp" },
  { to: "/screening?type=nails", label: "Nail Analysis", icon: "nails" },
  { to: "/history", label: "View History", icon: "chart" },
  { to: "/chat", label: "Chat with DermAI", icon: "chat" },
  { to: "/doctors", label: "Find a Doctor", icon: "hospital" },
  { to: "/nutrition", label: "Nutrition Insights", icon: "nutrition" },
  { to: "/reminders", label: "Reminders", icon: "clock" },
];

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

  const { stats, recent, latest } = data;
  const first = (user?.name || "there").split(" ")[0];

  return (
    <div className="container page">
      <div className="flex-between mb-2">
        <h1 className="page-title">Welcome back, {first}</h1>
        <Link href="/screening" className="btn btn-primary">Start New Screening</Link>
      </div>
      <p className="page-sub">Here is an overview of your screenings and health journey.</p>

      <div className="stat-grid mb-3">
        <StatCard label="Total screenings" value={stats.total} />
        <StatCard label="Low severity" value={stats.low} />
        <StatCard label="Moderate severity" value={stats.moderate} />
        <StatCard label="High severity" value={stats.high} />
      </div>

      <h2 className="section-title">Quick Actions</h2>
      <div className="feature-grid stagger">
        {QUICK.map((q) => (
          <Link href={q.to} key={q.label} className="feature-card">
            <div className="feature-icon feature-icon-teal">
              <Icon name={q.icon} size={24} />
            </div>
            <h3>{q.label}</h3>
          </Link>
        ))}
      </div>

      <h2 className="section-title">Recent Screenings</h2>
      {recent.length === 0 ? (
        <div className="empty-state card">
          <h3>No screenings yet</h3>
          <p className="small muted">Start your first screening to see results here.</p>
          <Link className="btn btn-primary mt-2" href="/screening">Start Screening</Link>
        </div>
      ) : (
        <div className="card">
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
      )}

      {latest && (
        <>
          <h2 className="section-title">Latest Result</h2>
          <div className="card">
            <div className="flex-between">
              <div>
                <div className="muted small">{latest.created_at} · {latest.screening_type} screening</div>
                <h3 className="mt-1">{latest.overall_condition}</h3>
                <div className="flex-center mt-1">
                  <SeverityBadge severity={latest.overall_severity} />
                  <span className="small muted">Confidence {(latest.overall_confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
              <Link className="btn btn-secondary" href={`/history/${latest.id}`}>View Details</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}