"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { Spinner } from "@/components/ui";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  if (loading || user) return <Spinner />;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
      setShake((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page">
      <div className="auth-wrap">
        <div className="auth-art cutout-blob float-soft">
          <img src="/images/hair-scan-device.jpg" alt="Scalp scan with a handheld dermatoscope" />
          <span className="hud-chip" style={{ bottom: "1rem", left: "1rem" }}>
            <span className="dot dot-live" /> secure sign-in
          </span>
        </div>
        <div className="auth-card card" key={shake}>
          <h1 className="page-title center">Login</h1>
          <p className="center muted small mb-3">Welcome back to DermAI</p>
          {error && <div className={`form-error ${shake > 0 ? "shake" : ""}`}>{error}</div>}
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
              {busy ? "Logging in…" : "Login"}
            </button>
          </form>
          <p className="center small mt-3">
            No account? <Link href="/signup">Create one</Link>
          </p>
          <p className="center small muted mt-1">
            Demo credentials: <code>demo@dermai.app / Demo@1234</code>
          </p>
        </div>
      </div>
    </div>
  );
}