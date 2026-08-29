"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/components/providers";
import { Spinner } from "@/components/ui";

export default function SignupPage() {
  const { user, loading } = useAuth();
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
      await api("/api/auth/register", { method: "POST", body: form });
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
    <div className="container page">
      <div className="auth-wrap">
        <div className="auth-art cutout-blob float-soft">
          <img src="/images/auth-skin-check.jpg" alt="Skin check at the clinic" />
          <span className="hud-chip" style={{ bottom: "1rem", left: "1rem" }}>
            <span className="dot dot-live" /> new account
          </span>
        </div>
        <div className="auth-card card" key={shake}>
          <h1 className="page-title center">Create your account</h1>
          <p className="center muted small mb-3">Join DermAI for AI-assisted screening</p>
          {error && <div className={`form-error ${shake > 0 ? "shake" : ""}`}>{error}</div>}
          <form onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" className="input" value={form.name} onChange={set("name")} />
              {errors.name && <div className="field-error">{errors.name}</div>}
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" className="input" value={form.email} onChange={set("email")} />
              {errors.email && <div className="field-error">{errors.email}</div>}
            </div>
            <div className="grid grid-2">
              <div className="field">
                <label htmlFor="age">Age</label>
                <input id="age" type="number" min="1" max="120" className="input" value={form.age} onChange={set("age")} />
                {errors.age && <div className="field-error">{errors.age}</div>}
              </div>
              <div className="field">
                <label htmlFor="sex">Sex</label>
                <select id="sex" className="select" value={form.sex} onChange={set("sex")}>
                  <option value="">Select…</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
                {errors.sex && <div className="field-error">{errors.sex}</div>}
              </div>
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" className="input" value={form.password} onChange={set("password")} placeholder="Min 8 chars, 1 uppercase, 1 number" />
              {errors.password && <div className="field-error">{errors.password}</div>}
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input id="confirm" type="password" className="input" value={form.confirm_password} onChange={set("confirm_password")} />
              {errors.confirm_password && <div className="field-error">{errors.confirm_password}</div>}
            </div>
            <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
              {busy ? "Creating account…" : "Sign up"}
            </button>
          </form>
          <p className="center small mt-3">
            Already have an account? <Link href="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}