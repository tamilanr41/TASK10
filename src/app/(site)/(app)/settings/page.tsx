"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers";
import { BackLink } from "@/components/ui";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [autoReminders, setAutoReminders] = useState(true);
  const [saved, setSaved] = useState(false);

  const save = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    localStorage.setItem("dermai_prefs", JSON.stringify({ autoReminders }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="container page">
      <BackLink to="/profile" label="Back to Profile" />
      <h1 className="page-title mt-2">Settings</h1>
      <p className="page-sub">Preferences for your DermAI account</p>

      <div className="auth-card card">
        <h3>Preferences</h3>
        <form onSubmit={save}>
          <label className="check-row mb-2">
            <input
              type="checkbox"
              checked={autoReminders}
              onChange={(e) => setAutoReminders(e.target.checked)}
            />
            Show reminder suggestions after each screening (in-app)
          </label>

          {saved && <div className="form-success">Preferences saved.</div>}

          <div className="field">
            <button className="btn btn-primary" type="submit">Save preferences</button>
          </div>
        </form>

        <hr className="section-divider" />

        <h3>Account</h3>
        <p className="small muted mb-2">
          Signed in as <b>{user?.email}</b>
        </p>
        <div className="flex-center">
          <button className="btn btn-outline" onClick={logout}>Logout</button>
        </div>

        <p className="small muted mt-3" style={{ fontStyle: "italic" }}>
          Authentication, screening history and report permissions are enforced by
          the backend. Your data is never shared with other users.
        </p>
      </div>
    </div>
  );
}