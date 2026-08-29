"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Spinner, SeverityBadge } from "@/components/ui";
import type { Screening } from "@/components/ScreeningView";

export default function HistoryPage() {
  const [items, setItems] = useState<Screening[] | null>(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("all");

  const load = () => {
    api<{ screenings: Screening[] }>("/api/history")
      .then((d) => setItems(d.screenings))
      .catch((e) => setErr(e.message));
  };

  useEffect(load, []);

  const filtered = (items || []).filter(
    (s) => tab === "all" || s.screening_type === tab
  );

  const download = async (id: string | number) => {
    const res = await api<Response>(`/api/reports/${id}/pdf`, { isBlob: true });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dermai_screening_${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const remove = async (id: string | number) => {
    if (!window.confirm("Delete this screening and its report?")) return;
    await api(`/api/history/${id}`, { method: "DELETE" });
    load();
  };

  if (err) return <div className="container page"><div className="alert alert-danger">{err}</div></div>;
  if (!items) return <div className="container page"><Spinner /></div>;

  return (
    <div className="container page">
      <h1 className="page-title">Screening History</h1>
      <p className="page-sub">You can only see your own screenings.</p>

      {items.length === 0 ? (
        <div className="empty-state card">
          <h3>No screenings yet</h3>
          <Link className="btn btn-primary mt-2" href="/screening">Start your first screening</Link>
        </div>
      ) : (
        <>
          <div className="tabs">
            {[
              ["all", "All"],
              ["scalp", "Scalp"],
              ["nails", "Nails"],
              ["combined", "Combined"],
            ].map(([k, l]) => (
              <button key={k} className={`tab ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>
                {l}
              </button>
            ))}
          </div>

          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Result</th>
                  <th>Confidence</th>
                  <th>Severity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>{s.created_at}</td>
                    <td className="muted">{s.screening_type}</td>
                    <td>{s.overall_condition}</td>
                    <td>{(s.overall_confidence * 100).toFixed(0)}%</td>
                    <td><SeverityBadge severity={s.overall_severity} /></td>
                    <td>
                      <div className="flex-center">
                        <Link className="btn btn-secondary btn-sm" href={`/history/${s.id}`}>View</Link>
                        <button className="btn btn-outline btn-sm" onClick={() => download(s.id)}>PDF</button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(s.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length > 1 && (
            <div className="card mt-3">
              <h3>Follow-up comparison</h3>
              <p className="small muted mb-2">
                Compare two of your screenings to observe changes. Changes in AI
                scores do not establish clinical improvement or worsening.
              </p>
              <Link className="btn btn-secondary btn-sm" href={`/history/compare/${filtered[0].id}/${filtered[1].id}`}>
                Compare latest two
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}