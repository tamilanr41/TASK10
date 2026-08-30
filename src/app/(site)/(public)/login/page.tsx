"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { Spinner } from "@/components/ui";
import { Orbs, Magnetic, motion, PageFade } from "@/components/motion";
import { Icon } from "@/components/Icon";

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
    <div className="dark-bg" style={{ minHeight: "calc(100vh - 150px)", display: "flex", alignItems: "center" }}>
      <Orbs seed={1} />
      <div className="container" style={{ position: "relative", zIndex: 2 }}>
        <div className="auth-wrap">
          <motion.div
            className="auth-art"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="hero-2-visual" style={{ width: "100%", aspectRatio: "4 / 4.6" }}>
              <div className="hero-2-visual-ring" />
              <img src="/images/hair-scan-device.jpg" alt="Scalp scan with a handheld dermatoscope" />
              <motion.span
                className="hero-2-chip"
                style={{ bottom: "8%", left: "-6%" }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <span className="dot-live" style={{ color: "#34d399", marginRight: ".45rem" }}>●</span>
                secure sign-in <b>· AES-256</b>
              </motion.span>
              <motion.span
                className="hero-2-chip"
                style={{ top: "10%", right: "-6%" }}
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                <span style={{ color: "#22d3ee", display: "inline-flex", verticalAlign: "-4px" }}>
                  <Icon name="scan" size={15} />
                </span>{" "}
                live analysis engine
              </motion.span>
            </div>
          </motion.div>

          <div>
            <PageFade>
              <div className="glass-strong auth-card" key={shake} style={{ padding: "2.2rem", position: "relative" }}>
                <motion.div
                  animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <motion.h1
                    className="page-title center"
                    style={{ color: "var(--ink-light)" }}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    Welcome back
                  </motion.h1>
                  <p className="center muted small mb-3">Sign in to your DermAI workspace</p>
                  {error && <div className="form-error">{error}</div>}
                  <form onSubmit={submit}>
                    <div className="field">
                      <label htmlFor="email">Email</label>
                      <input
                        id="email"
                        type="email"
                        className="input input-dark"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                      />
                    </div>
                    <div className="field">
                      <div className="flex-between" style={{ flexWrap: "nowrap" }}>
                        <label htmlFor="password">Password</label>
                      </div>
                      <input
                        id="password"
                        type="password"
                        className="input input-dark"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                      />
                    </div>
                    <Magnetic className="mt-2" strength={0.18}>
                      <button className="btn btn-primary btn-dark-glow" style={{ width: "100%" }} disabled={busy}>
                        {busy ? "Authenticating…" : "Login"}
                      </button>
                    </Magnetic>
                  </form>
                  <p className="center small mt-3" style={{ color: "var(--ink-light-dim)" }}>
                    No account? <Link href="/signup" style={{ color: "#5eead4" }}>Create one</Link>
                  </p>
                  <p className="center small mt-1" style={{ color: "var(--ink-light-dim)" }}>
                    Demo: <code style={{ color: "#5eead4" }}>demo@dermai.app / Demo@1234</code>
                  </p>
                </motion.div>
              </div>
            </PageFade>
          </div>
        </div>
      </div>
    </div>
  );
}