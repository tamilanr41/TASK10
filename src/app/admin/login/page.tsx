"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { Logo } from "@/components/ui";
import { Orbs, Magnetic, motion } from "@/components/motion";

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
    <div className="dark-bg" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.5rem" }}>
      <Orbs seed={3} />
      <motion.div
        style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 430 }}
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="glass-strong auth-card" style={{ width: "100%", padding: "2.2rem" }}>
          <div className="center mb-2">
            <Logo to="/admin/login" />
            <p className="muted small mt-1" style={{ color: "var(--ink-light-dim)" }}>Administrator sign in</p>
          </div>
          {error && <div className="form-error">{error}</div>}
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="a_email" style={{ color: "var(--ink-light)" }}>Email</label>
              <input id="a_email" type="email" className="input input-dark" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@dermai.app" />
            </div>
            <div className="field">
              <label htmlFor="a_pass" style={{ color: "var(--ink-light)" }}>Password</label>
              <input id="a_pass" type="password" className="input input-dark" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <Magnetic strength={0.18}>
              <button className="btn btn-primary btn-dark-glow" style={{ width: "100%" }} disabled={busy}>
                {busy ? "Signing in…" : "Sign in as admin"}
              </button>
            </Magnetic>
          </form>
          <p className="center small mt-3" style={{ color: "var(--ink-light-dim)" }}>
            Demo: <code style={{ color: "#5eead4" }}>admin@dermai.app / Admin@1234</code>
          </p>
        </div>
      </motion.div>
    </div>
  );
}