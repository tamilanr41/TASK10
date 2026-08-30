"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/providers";
import { Spinner, BackLink } from "@/components/ui";
import { PageFade, Reveal, CountUp } from "@/components/motion";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [screeningCount, setScreeningCount] = useState<number | null>(null);

  useEffect(() => {
    api<{ user: { screening_count?: number } }>("/api/auth/me")
      .then((d) => setScreeningCount(d.user.screening_count ?? null))
      .catch(() => {});
  }, []);

  if (!user) return <div className="container page"><Spinner /></div>;

  return (
    <PageFade>
      <div className="container page">
        <BackLink to="/dashboard" label="Back to Dashboard" />
        <h1 className="page-title mt-2">Your Profile</h1>
        <p className="page-sub">Your account information</p>

        <Reveal>
          <div className="card auth-card profile-card">
            <div className="profile-head">
              <div className="profile-avatar">{user.name?.[0] || "U"}</div>
              <div>
                <b>{user.name}</b>
                <div className="small muted">{user.email}</div>
              </div>
              <span className={`badge ${user.is_active ? "badge-low" : "badge-high"}`} style={{ marginLeft: "auto" }}>
                {user.is_active ? "Active" : "Disabled"}
              </span>
            </div>

            <table className="table">
              <tbody>
                {[
                  ["Age", user.age || "—"],
                  ["Sex", user.sex || "—"],
                  ["Role", user.role],
                  ["Member since", user.created_at],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td><b>{k}</b></td>
                    <td>{v}</td>
                  </tr>
                ))}
                <tr>
                  <td><b>Total screenings</b></td>
                  <td>{screeningCount != null ? <CountUp value={screeningCount} /> : "…"}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex-center mt-3">
              <button className="btn btn-outline" onClick={logout}>Logout</button>
              <a className="btn btn-secondary" href="/settings" style={{ textDecoration: "none" }}>Settings</a>
            </div>
          </div>
        </Reveal>
      </div>
    </PageFade>
  );
}