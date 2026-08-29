"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Spinner } from "@/components/ui";

type RecommendationItem = {
  id: number;
  title: string;
  category: string;
  description?: string;
  severity?: string;
  is_active: boolean;
};

type RecommendationForm = {
  title: string;
  category: string;
  description: string;
  severity: string;
  is_active: boolean;
};

const EMPTY: RecommendationForm = { title: "", category: "precaution", description: "", severity: "all", is_active: true };

export default function AdminRecommendationsPage() {
  const [items, setItems] = useState<RecommendationItem[] | null>(null);
  const [err, setErr] = useState("");
  const [form, setForm] = useState<RecommendationForm>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = () => api<{ recommendations: RecommendationItem[] }>("/api/admin/recommendations").then((d) => setItems(d.recommendations)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const set = (k: Exclude<keyof RecommendationForm, "is_active">) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (editingId) await api(`/api/admin/recommendations/${editingId}`, { method: "PUT", body: form });
      else await api("/api/admin/recommendations", { method: "POST", body: form });
      setForm(EMPTY); setEditingId(null); load();
    } catch (ex) { setErr((ex as Error).message); }
  };

  const edit = (r: RecommendationItem) => { setEditingId(r.id); setForm({ title: r.title, category: r.category, description: r.description || "", severity: r.severity || "all", is_active: r.is_active }); };
  const remove = async (r: RecommendationItem) => { if (!window.confirm(`Delete "${r.title}"?`)) return; await api(`/api/admin/recommendations/${r.id}`, { method: "DELETE" }); load(); };

  if (err) return <div className="alert alert-danger">{err}</div>;
  if (!items) return <Spinner />;

  return (
    <div>
      <h1 className="page-title">Recommendation Management</h1>
      <p className="page-sub">General, non-prescriptive recommendation library.</p>

      <div className="grid grid-2">
        <div className="card">
          <h3>{editingId ? "Edit recommendation" : "Add recommendation"}</h3>
          <form onSubmit={submit}>
            <div className="field">
              <label>Title</label>
              <input className="input" required value={form.title} onChange={set("title")} />
            </div>
            <div className="grid grid-2">
              <div className="field">
                <label>Category</label>
                <select className="select" value={form.category} onChange={set("category")}>
                  <option value="precaution">Precaution</option>
                  <option value="homecare">Home care</option>
                  <option value="avoid">Avoid</option>
                  <option value="consult">Consult</option>
                </select>
              </div>
              <div className="field">
                <label>Severity</label>
                <select className="select" value={form.severity} onChange={set("severity")}>
                  <option value="all">All</option>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea className="textarea" rows={2} value={form.description} onChange={set("description")} />
            </div>
            <label className="check-row mb-2">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active
            </label>
            <div className="flex-center">
              <button className="btn btn-primary" type="submit">{editingId ? "Save changes" : "Add recommendation"}</button>
              {editingId && <button className="btn btn-outline" onClick={() => { setEditingId(null); setForm(EMPTY); }}>Cancel</button>}
            </div>
          </form>
        </div>

        <div className="card">
          <h3 className="mb-2">Recommendation library</h3>
          {items.map((r) => (
            <div key={r.id} style={{ borderBottom: "1px solid var(--slate-200)", padding: "0.6rem 0" }}>
              <div className="flex-between">
                <div>
                  <b>{r.title}</b>
                  <div className="flex-center mt-1">
                    <span className="badge badge-teal">{r.category}</span>
                    <span className="badge badge-slate">{r.severity}</span>
                  </div>
                </div>
                <div className="flex-center">
                  <button className="btn btn-outline btn-sm" onClick={() => edit(r)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(r)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}