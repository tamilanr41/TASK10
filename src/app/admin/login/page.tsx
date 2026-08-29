"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { Logo } from "@/components/ui";

export default function AdminLoginPage() {
  const { adminLogin } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminLogin(email, password);
      router.push("/admin");
      window.location.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.5rem" }}>
      <div className="auth-card card" style={{ width: "100%" }}>
        <div className="center mb-2">
          <Logo to="/admin/login" />
          <p className="muted small mt-1">Administrator sign in</p>
        </div>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="a_email">Email</label>
            <input id="a_email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@dermai.app" />
          </div>
          <div className="field">
            <label htmlFor="a_pass">Password</label>
            <input id="a_pass" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
            {busy ? "Signing in…" : "Sign in as admin"}
          </button>
        </form>
        <p className="center small muted mt-3">
          Demo: <code>admin@dermai.app / Admin@1234</code>
        </p>
      </div>
    </div>
  );
}