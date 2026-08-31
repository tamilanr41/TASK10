"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Spinner, SeverityBadge, BackLink } from "@/components/ui";
import { DoctorActions } from "@/components/DoctorActions";
import { PageFade, Reveal, Stagger, Item, Tilt } from "@/components/motion";

type Doctor = {
  id: number;
  name: string;
  specialization?: string;
  clinic?: string;
  location?: string;
  city?: string;
  availability?: string;
  contact?: string;
  consultation_info?: string;
  is_sample?: boolean;
};

type DoctorsResponse = {
  doctors?: Doctor[];
  sample_notice?: string;
};

export default function DoctorsPage() {
  const [city, setCity] = useState("");
  const [area, setArea] = useState("combined");
  const [severity, setSeverity] = useState("moderate");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [notice, setNotice] = useState("");
  const [loaded, setLoaded] = useState(false);

  const search = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    const q = new URLSearchParams();
    if (city) q.set("city", city);
    if (area) q.set("screening_area", area);
    q.set("severity", severity);
    const data = await api<DoctorsResponse>(`/api/doctors?${q.toString()}`);
    setDoctors(data.doctors || []);
    setNotice(data.sample_notice || "");
    setLoaded(true);
  };

  useEffect(() => {
    search();
  }, []);

  return (
    <PageFade>
      <div className="container page">
        <BackLink to="/dashboard" label="Back to Dashboard" />
        <h1 className="page-title mt-2">Doctor Recommendation</h1>
        <p className="page-sub">
          Find dermatologists by location, screening area and severity.
        </p>

        <Reveal>
          <div className="cutout-blob mb-3" style={{ maxWidth: 560, aspectRatio: "16 / 9" }}>
            <img src="/images/clinic-consult.jpg" alt="Hair and nail clinic consultation" style={{ height: "100%" }} />
          </div>
        </Reveal>

        <Reveal>
          <div className="card mb-3">
            <form onSubmit={search}>
              <div className="grid grid-3">
                <div className="field">
                  <label htmlFor="city">City / location</label>
                  <input id="city" className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Chennai" />
                </div>
                <div className="field">
                  <label htmlFor="area">Screening area</label>
                  <select id="area" className="select" value={area} onChange={(e) => setArea(e.target.value)}>
                    <option value="scalp">Scalp / Hair</option>
                    <option value="nails">Nails</option>
                    <option value="combined">Combined</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="severity">Severity</label>
                  <select id="severity" className="select" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <button className="btn btn-primary" type="submit">Search doctors</button>
            </form>
          </div>
        </Reveal>

        {notice && <div className="alert alert-warn mb-3">{notice}</div>}

        {!loaded ? (
          <Spinner />
        ) : doctors.length === 0 ? (
          <div className="empty-state card">
            <h3>No matching doctors found</h3>
            <p className="small muted">Try a different city or clear the location field.</p>
          </div>
        ) : (
          <Stagger className="feature-grid" gap={0.08}>
            {doctors.map((d) => (
              <Item key={`${d.name}-${d.id}`}>
                <Tilt className="card card-hover doctor-card" max={8} style={{ height: "100%" }}>
                  <div className="flex-between">
                    <h3>{d.name}</h3>
                    {d.is_sample && <span className="badge badge-demo">Sample</span>}
                  </div>
                  <p className="small muted">{d.specialization}</p>
                  <p className="small">{d.clinic}</p>
                  <p className="small muted">📍 {d.location || d.city}</p>
                  <p className="small">🕒 {d.availability}</p>
                  <p className="small">📞 {d.contact}</p>
                  {d.consultation_info && <p className="small muted">{d.consultation_info}</p>}
                  <DoctorActions name={d.name} contact={d.contact} />
                </Tilt>
              </Item>
            ))}
          </Stagger>
        )}

        <Reveal>
          <div className="card mt-3">
            <h3>When to consult</h3>
            <div className="mt-1">
              <SeverityBadge severity="high" /> Clearly recommend consultation with a qualified dermatologist/healthcare professional.
            </div>
            <div className="mt-1">
              <SeverityBadge severity="moderate" /> Recommend monitoring and considering consultation with a healthcare professional.
            </div>
            <div className="mt-1">
              <SeverityBadge severity="low" /> General wellness guidance and monitoring.
            </div>
            <p className="small muted mt-2">
              Doctor records shown here are sample/placeholder entries for the college
              prototype unless verified real-world data is connected.
            </p>
          </div>
        </Reveal>
      </div>
    </PageFade>
  );
}