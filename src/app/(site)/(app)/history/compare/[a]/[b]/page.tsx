"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Spinner, SeverityBadge, BackLink } from "@/components/ui";
import { PageFade, Reveal } from "@/components/motion";
import type { Screening } from "@/components/ScreeningView";

type CompareData = {
  previous: Screening;
  current: Screening;
  note: string;
};

function Side({ title, item }: { title: string; item: Screening }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p className="muted small">{item.created_at}</p>
      <p className="mt-1">
        <b>{item.overall_condition}</b>
      </p>
      <div className="flex-center mt-1">
        <SeverityBadge severity={item.overall_severity} />
        <span className="small muted">Confidence {(item.overall_confidence * 100).toFixed(0)}%</span>
      </div>
      <p className="small muted mt-1">{item.screening_type} screening</p>
      <div className="mt-2 flex-center">
        <Link className="btn btn-secondary btn-sm" href={`/history/${item.id}`}>Details</Link>
      </div>
    </div>
  );
}

export default function ComparePage() {
  const params = useParams();
  const a = params.a;
  const b = params.b;
  const [data, setData] = useState<CompareData | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<CompareData>(`/api/history/compare/${a}/${b}`)
      .then(setData)
      .catch((e) => setErr(e.message));
  }, [a, b]);

  if (err) return <div className="container page"><div className="alert alert-danger">{err}</div></div>;
  if (!data) return <div className="container page"><Spinner /></div>;

  const rows: Array<[string, ReactNode, ReactNode]> = [
    ["Date", data.previous.created_at, data.current.created_at],
    ["Type", data.previous.screening_type, data.current.screening_type],
    ["Possible condition", data.previous.overall_condition, data.current.overall_condition],
    [
      "Confidence",
      `${(data.previous.overall_confidence * 100).toFixed(0)}%`,
      `${(data.current.overall_confidence * 100).toFixed(0)}%`,
    ],
    ["Severity", <SeverityBadge key="a" severity={data.previous.overall_severity} />, <SeverityBadge key="b" severity={data.current.overall_severity} />],
  ];

  return (
    <PageFade>
      <div className="container page">
        <BackLink to="/history" label="Back to History" />
        <h1 className="page-title mt-2">Follow-up comparison</h1>
        <p className="page-sub">Previous vs current screening</p>

        <Reveal>
          <div className="alert alert-info mb-3">
            {data.note}
          </div>
        </Reveal>

        <Reveal>
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Aspect</th>
                  <th>Previous</th>
                  <th>Current</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, left, right]) => (
                  <tr key={label}>
                    <td><b>{label}</b></td>
                    <td>{left}</td>
                    <td>{right}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <div className="compare-grid mt-3">
          <Reveal><Side title="Previous screening" item={data.previous} /></Reveal>
          <Reveal delay={0.12}><Side title="Current screening" item={data.current} /></Reveal>
        </div>
      </div>
    </PageFade>
  );
}