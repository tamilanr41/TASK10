"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Spinner, SeverityBadge } from "@/components/ui";
import { PageFade, Reveal, motion, AnimatePresence } from "@/components/motion";
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
    <PageFade>
      <div className="container page">
        <h1 className="page-title">Screening History</h1>
        <p className="page-sub">You can only see your own screenings.</p>

        {items.length === 0 ? (
          <Reveal>
            <div className="empty-state card">
              <h3>No screenings yet</h3>
              <Link className="btn btn-primary mt-2" href="/screening">Start your first screening</Link>
            </div>
          </Reveal>
        ) : (
          <>
            <Reveal>
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
            </Reveal>

            <Reveal>
              <div className="card table-wrap">
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
                    <AnimatePresence>
                    {filtered.map((s) => (
                      <motion.tr
                        key={s.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      >
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
                      </motion.tr>
                    ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </Reveal>

            {filtered.length > 1 && (
              <Reveal>
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
              </Reveal>
            )}
          </>
        )}
      </div>
    </PageFade>
  );
}