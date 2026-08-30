"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Spinner } from "@/components/ui";

type AdminScreening = {
  id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  screening_type: string;
  mode?: string;
  overall_condition?: string | null;
  overall_severity?: string | null;
  overall_confidence?: number | null;
  created_at?: string;
};

type ScreeningDetail = AdminScreening & {
  symptoms?: unknown;
  predictions?: unknown;
  summary_text?: string | null;
  recommendations?: unknown;
};

export default function AdminScreeningsPage() {
  const [rows, setRows] = useState<AdminScreening[] | null>(null);
  const [search, setSearch] = useState("");
  const [err, setErr] = useState("");
  const [detail, setDetail] = useState<ScreeningDetail | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = (q = "") => {
    api<{ screenings: AdminScreening[] }>(`/api/admin/screenings${q ? `?search=${encodeURIComponent(q)}` : ""}`)
      .then((d) => setRows(d.screenings))
      .catch((e) => setErr(e.message));
  };

  useEffect(() => {
    load();
  }, []);

  const open = async (id: number) => {
    try {
      const d = await api<{ screening: ScreeningDetail }>(`/api/admin/screenings/${id}`);
      setDetail(d.screening);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const remove = async (s: AdminScreening) => {
    if (!window.confirm(`Delete screening #${s.id} from "${s.user_name || s.user_email}"? This cannot be undone.`)) return;
    setDeleting(s.id);
    try {
      await api(`/api/admin/screenings/${s.id}`, { method: "DELETE" });
      if (detail?.id === s.id) setDetail(null);
      load(search);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setDeleting(null);
    }
  };

  type PredictionRow = { key?: string; condition?: string; severity?: string; confidence?: number };

  const predictions: PredictionRow[] = Array.isArray(detail?.predictions)
    ? (detail!.predictions as PredictionRow[])
    : [];

  if (err) return <div className="alert alert-danger">{err}</div>;
  if (!rows) return <Spinner />;

  return (
    <div>
      <div className="flex-between mb-2">
        <h1 className="page-title">Screening Records</h1>
        <input className="input" style={{ width: 280 }} placeholder="Search user, condition or type…" value={search} onChange={(e) => { setSearch(e.target.value); load(e.target.value); }} />
      </div>
      <p className="small muted mb-2">Every screening submitted by every user, newest first. View details or delete a record.</p>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Date</th>
              <th>Type</th>
              <th>Condition</th>
              <th>Severity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="muted">No screenings found.</td></tr>
            )}
            {rows.map((s) => (
              <tr key={s.id}>
                <td>#{s.id}</td>
                <td>{s.user_name || "—"}<br /><span className="small muted">{s.user_email || ""}</span></td>
                <td className="muted">{s.created_at ? new Date(s.created_at).toLocaleString() : "—"}</td>
                <td>{s.screening_type}</td>
                <td>{s.overall_condition || "—"}</td>
                <td>
                  <span className={`badge ${s.overall_severity === "high" ? "badge-high" : s.overall_severity === "moderate" ? "badge-moderate" : "badge-low"}`}>
                    {s.overall_severity || "—"}
                  </span>
                </td>
                <td>
                  <div className="flex" style={{ gap: "0.35rem", flexWrap: "wrap" }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => open(s.id)}>View</button>
                    <button className="btn btn-sm btn-danger" disabled={deleting === s.id} onClick={() => remove(s)}>
                      {deleting === s.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="admin-drawer-overlay" onClick={() => setDetail(null)}>
          <aside className="admin-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="flex-between mb-2">
              <h3>Screening #{detail.id}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setDetail(null)}>Close</button>
            </div>
            <div className="stack" style={{ gap: "0.6rem" }}>
              <div><span className="muted">User:</span> {detail.user_name || "—"} <span className="muted">({detail.user_email || ""})</span></div>
              <div><span className="muted">Date:</span> {detail.created_at ? new Date(detail.created_at).toLocaleString() : "—"}</div>
              <div><span className="muted">Type:</span> {detail.screening_type} <span className="muted">· mode</span> {detail.mode || "—"}</div>
              <div><span className="muted">Overall:</span> {detail.overall_condition || "—"} ·{" "}
                <span className={`badge ${detail.overall_severity === "high" ? "badge-high" : detail.overall_severity === "moderate" ? "badge-moderate" : "badge-low"}`}>{detail.overall_severity || "—"}</span>{" "}
                <span className="muted">{(detail.overall_confidence ?? 0).toFixed(0)}%</span>
              </div>
              {detail.symptoms ? (
                <div>
                  <div className="muted small">Symptoms</div>
                  <pre className="admin-json">{JSON.stringify(detail.symptoms, null, 2)}</pre>
                </div>
              ) : null}
              {detail.summary_text ? (
                <div>
                  <div className="muted small">Summary</div>
                  <p className="small">{detail.summary_text}</p>
                </div>
              ) : null}
              {predictions.length > 0 && (
                <div>
                  <div className="muted small">Predictions</div>
                  <ul className="stack" style={{ gap: "0.4rem" }}>
                    {predictions.map((p, i) => (
                      <li key={i} className="card card-hover" style={{ margin: 0, padding: "0.7rem 0.9rem" }}>
                        <div className="flex-between">
                          <span>{p.condition || p.key || "—"}</span>
                          <span className={`badge ${p.severity === "high" ? "badge-high" : p.severity === "moderate" ? "badge-moderate" : "badge-low"}`}>
                            {p.severity || "—"} {p.confidence != null ? `· ${(p.confidence * 100).toFixed(0)}%` : ""}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {detail.recommendations ? (
                <div>
                  <div className="muted small">Recommendations</div>
                  <pre className="admin-json">{JSON.stringify(detail.recommendations, null, 2)}</pre>
                </div>
              ) : null}
              <button className="btn btn-danger" style={{ width: "100%" }} onClick={() => { const s = detail; setDetail(null); remove(s); }}>
                Delete this screening
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}