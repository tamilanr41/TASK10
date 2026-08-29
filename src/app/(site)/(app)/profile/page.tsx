"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/providers";
import { Spinner, BackLink } from "@/components/ui";

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
    <div className="container page">
      <BackLink to="/dashboard" label="Back to Dashboard" />
      <h1 className="page-title mt-2">Your Profile</h1>
      <p className="page-sub">Your account information</p>

      <div className="card auth-card">
        <div className="flex-center mb-3">
          <div className="avatar">{user.name?.[0] || "U"}</div>
          <div>
            <b>{user.name}</b>
            <div className="small muted">{user.email}</div>
          </div>
        </div>

        <table className="table">
          <tbody>
            <tr>
              <td><b>Age</b></td>
              <td>{user.age || "—"}</td>
            </tr>
            <tr>
              <td><b>Sex</b></td>
              <td>{user.sex || "—"}</td>
            </tr>
            <tr>
              <td><b>Role</b></td>
              <td>{user.role}</td>
            </tr>
            <tr>
              <td><b>Member since</b></td>
              <td>{user.created_at}</td>
            </tr>
            <tr>
              <td><b>Total screenings</b></td>
              <td>{screeningCount ?? "…"}</td>
            </tr>
            <tr>
              <td><b>Account status</b></td>
              <td>
                <span className={`badge ${user.is_active ? "badge-low" : "badge-high"}`}>
                  {user.is_active ? "Active" : "Disabled"}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex-center mt-3">
          <button className="btn btn-outline" onClick={logout}>Logout</button>
          <a className="btn btn-secondary" href="/settings" style={{ textDecoration: "none" }}>Settings</a>
        </div>
      </div>
    </div>
  );
}