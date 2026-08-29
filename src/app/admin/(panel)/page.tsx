"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Spinner, StatCard, SeverityBadge } from "@/components/ui";

type AdminStats = {
  total_users: number;
  total_screenings: number;
  scalp_screenings: number;
  nail_screenings: number;
  combined_screenings: number;
  severity_distribution: Record<string, number>;
  most_common_predictions: { condition: string; count: number }[];
  recent_activity: {
    id: number;
    user_id: number;
    created_at: string;
    screening_type: string;
    overall_condition: string;
    overall_severity: string;
  }[];
  demo_mode?: boolean;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<AdminStats>("/api/admin/stats")
      .then(setStats)
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="alert alert-danger">{err}</div>;
  if (!stats) return <Spinner />;

  const total = stats.total_screenings || 0;
  const sev: Record<string, number> = stats.severity_distribution || {};

  return (
    <div>
      <h1 className="page-title">Admin Dashboard</h1>
      <p className="page-sub">Screening statistics and recent activity</p>

      <div className="stat-grid mb-3">
        <StatCard label="Total users" value={stats.total_users} />
        <StatCard label="Total screenings" value={total} />
        <StatCard label="Scalp/hair screenings" value={stats.scalp_screenings} />
        <StatCard label="Nail screenings" value={stats.nail_screenings} />
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Severity distribution</h3>
          <table className="table mt-2">
            <tbody>
              {(["low", "moderate", "high"]).map((k) => (
                <tr key={k}>
                  <td><SeverityBadge severity={k} /></td>
                  <td>{sev[k] || 0}</td>
                </tr>
              ))}
              {Object.keys(sev)
                .filter((k) => !["low", "moderate", "high"].includes(k))
                .map((k) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td>{sev[k]}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p className="small muted mt-2">Combined screenings: {stats.combined_screenings}</p>
        </div>

        <div className="card">
          <h3>Most common demo predictions</h3>
          <table className="table mt-2">
            <thead>
              <tr>
                <th>Condition</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {(stats.most_common_predictions || []).map((p) => (
                <tr key={p.condition}>
                  <td>{p.condition}</td>
                  <td>{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-3">
        <h3>Recent activity</h3>
        {stats.recent_activity.length === 0 ? (
          <p className="small muted">No screenings yet.</p>
        ) : (
          <table className="table mt-2">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Date</th>
                <th>Type</th>
                <th>Result</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_activity.map((s) => (
                <tr key={s.id}>
                  <td>#{s.id}</td>
                  <td>User #{s.user_id}</td>
                  <td>{s.created_at}</td>
                  <td>{s.screening_type}</td>
                  <td className="muted">{s.overall_condition}</td>
                  <td><SeverityBadge severity={s.overall_severity} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="small muted mt-2">
          Admin features do not expose unnecessary private user information.
        </p>
      </div>
    </div>
  );
}