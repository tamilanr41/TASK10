"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Spinner } from "@/components/ui";

type ConditionItem = {
  id: number;
  name: string;
  category: string;
  description?: string;
  severity_guidance?: string;
  general_recommendations?: string;
};

type ConditionForm = {
  name: string;
  category: string;
  description: string;
  severity_guidance: string;
  general_recommendations: string;
};

const EMPTY: ConditionForm = { name: "", category: "scalp", description: "", severity_guidance: "", general_recommendations: "" };

export default function AdminConditionsPage() {
  const [items, setItems] = useState<ConditionItem[] | null>(null);
  const [err, setErr] = useState("");
  const [form, setForm] = useState<ConditionForm>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = () => api<{ conditions: ConditionItem[] }>("/api/admin/conditions").then((d) => setItems(d.conditions)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const set = (k: keyof ConditionForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (editingId) await api(`/api/admin/conditions/${editingId}`, { method: "PUT", body: form });
      else await api("/api/admin/conditions", { method: "POST", body: form });
      setForm(EMPTY); setEditingId(null); load();
    } catch (ex) { setErr((ex as Error).message); }
  };

  const edit = (c: ConditionItem) => { setEditingId(c.id); setForm({ name: c.name, category: c.category, description: c.description || "", severity_guidance: c.severity_guidance || "", general_recommendations: c.general_recommendations || "" }); };
  const remove = async (c: ConditionItem) => { if (!window.confirm(`Delete ${c.name}?`)) return; await api(`/api/admin/conditions/${c.id}`, { method: "DELETE" }); load(); };

  if (err) return <div className="alert alert-danger">{err}</div>;
  if (!items) return <Spinner />;

  return (
    <div>
      <h1 className="page-title">Condition Management</h1>
      <p className="page-sub">Manage condition names, categories, severity guidance and general recommendations.</p>

      <div className="grid grid-2">
        <div className="card">
          <h3>{editingId ? "Edit condition" : "Add condition"}</h3>
          <form onSubmit={submit}>
            <div className="field">
              <label>Condition name</label>
              <input className="input" required value={form.name} onChange={set("name")} />
            </div>
            <div className="field">
              <label>Category</label>
              <select className="select" value={form.category} onChange={set("category")}>
                <option value="scalp">Scalp</option>
                <option value="hair">Hair</option>
                <option value="nails">Nails</option>
                <option value="general">General</option>
              </select>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea className="textarea" rows={2} value={form.description} onChange={set("description")} />
            </div>
            <div className="field">
              <label>Severity guidance</label>
              <textarea className="textarea" rows={2} value={form.severity_guidance} onChange={set("severity_guidance")} />
            </div>
            <div className="field">
              <label>General recommendations</label>
              <textarea className="textarea" rows={2} value={form.general_recommendations} onChange={set("general_recommendations")} />
            </div>
            <div className="flex-center">
              <button className="btn btn-primary" type="submit">{editingId ? "Save changes" : "Add condition"}</button>
              {editingId && <button className="btn btn-outline" onClick={() => { setEditingId(null); setForm(EMPTY); }}>Cancel</button>}
            </div>
          </form>
        </div>

        <div className="card">
          <h3 className="mb-2">Conditions</h3>
          {items.map((c) => (
            <div key={c.id} style={{ borderBottom: "1px solid var(--slate-200)", padding: "0.6rem 0" }}>
              <div className="flex-between">
                <b>{c.name}</b>
                <div className="flex-center">
                  <span className="badge badge-teal">{c.category}</span>
                  <button className="btn btn-outline btn-sm" onClick={() => edit(c)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(c)}>Delete</button>
                </div>
              </div>
              {c.description && <p className="small muted">{c.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}