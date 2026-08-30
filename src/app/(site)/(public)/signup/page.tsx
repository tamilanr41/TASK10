"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, setAuthToken } from "@/lib/api";
import { useAuth } from "@/components/providers";
import { Spinner } from "@/components/ui";
import { Orbs, Magnetic, motion, PageFade } from "@/components/motion";

export default function SignupPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({
    name: "",
    email: "",
    password: "",
    confirm_password: "",
    age: "",
    sex: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  if (loading || user) return <Spinner />;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setErrors({});
    setBusy(true);
    try {
      const data = await api("/api/auth/register", { method: "POST", body: form });
      if (data.token) setAuthToken(data.token as string);
      await refreshUser();
      router.push("/dashboard");
    } catch (err) {
      const e = err as Error & { fields?: unknown };
      if (e.fields) setErrors(e.fields as Record<string, string>);
      else setError(e.message);
      setShake((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dark-bg" style={{ minHeight: "calc(100vh - 150px)", display: "flex", alignItems: "center" }}>
      <Orbs seed={2} />
      <div className="container" style={{ position: "relative", zIndex: 2 }}>
        <div className="auth-wrap">
          <div className="auth-art">
            <PageFade>
              <div className="glass-strong auth-card" key={shake} style={{ padding: "2.2rem" }}>
                <motion.div animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.4 }}>
                  <motion.h1
                    className="page-title center"
                    style={{ color: "var(--ink-light)" }}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                  >
                    Create your account
                  </motion.h1>
                  <p className="center muted small mb-3">Join DermAI for AI-assisted screening</p>
                  {error && <div className="form-error">{error}</div>}
                  <form onSubmit={submit} noValidate>
                    <div className="field">
                      <label htmlFor="name">Full name</label>
                      <input id="name" className="input input-dark" value={form.name} onChange={set("name")} placeholder="Your full name" />
                      {errors.name && <div className="field-error">{errors.name}</div>}
                    </div>
                    <div className="field">
                      <label htmlFor="email">Email</label>
                      <input id="email" type="email" className="input input-dark" value={form.email} onChange={set("email")} placeholder="you@example.com" />
                      {errors.email && <div className="field-error">{errors.email}</div>}
                    </div>
                    <div className="grid grid-2">
                      <div className="field">
                        <label htmlFor="age">Age</label>
                        <input id="age" type="number" min="1" max="120" className="input input-dark" value={form.age} onChange={set("age")} placeholder="24" />
                        {errors.age && <div className="field-error">{errors.age}</div>}
                      </div>
                      <div className="field">
                        <label htmlFor="sex">Sex</label>
                        <select id="sex" className="select select-dark" value={form.sex} onChange={set("sex")}>
                          <option value="" style={{ color: "#0f172a" }}>Select…</option>
                          <option value="Female" style={{ color: "#0f172a" }}>Female</option>
                          <option value="Male" style={{ color: "#0f172a" }}>Male</option>
                          <option value="Other" style={{ color: "#0f172a" }}>Other</option>
                          <option value="Prefer not to say" style={{ color: "#0f172a" }}>Prefer not to say</option>
                        </select>
                        {errors.sex && <div className="field-error">{errors.sex}</div>}
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="password">Password</label>
                      <input id="password" type="password" className="input input-dark" value={form.password} onChange={set("password")} placeholder="Min 8 chars, 1 uppercase, 1 number" />
                      {errors.password && <div className="field-error">{errors.password}</div>}
                    </div>
                    <div className="field">
                      <label htmlFor="confirm">Confirm password</label>
                      <input id="confirm" type="password" className="input input-dark" value={form.confirm_password} onChange={set("confirm_password")} />
                      {errors.confirm_password && <div className="field-error">{errors.confirm_password}</div>}
                    </div>
                    <Magnetic strength={0.18}>
                      <button className="btn btn-primary btn-dark-glow" style={{ width: "100%" }} disabled={busy}>
                        {busy ? "Creating account…" : "Sign up"}
                      </button>
                    </Magnetic>
                  </form>
                  <p className="center small mt-3" style={{ color: "var(--ink-light-dim)" }}>
                    Already have an account? <Link href="/login" style={{ color: "#5eead4" }}>Login</Link>
                  </p>
                </motion.div>
              </div>
            </PageFade>
          </div>

          <motion.div
            className="auth-art"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="hero-2-visual" style={{ width: "100%", aspectRatio: "4 / 4.6" }}>
              <div className="hero-2-visual-ring" />
              <img src="/images/auth-skin-check.jpg" alt="Skin check at the clinic" />
              <motion.span
                className="hero-2-chip"
                style={{ bottom: "8%", left: "-6%" }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <span className="dot-live" style={{ color: "#34d399", marginRight: ".45rem" }}>●</span>
                new member <b>· onboarding</b>
              </motion.span>
              <motion.span
                className="hero-2-chip"
                style={{ top: "10%", right: "-6%" }}
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                ✦ smart screening, one step away
              </motion.span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}