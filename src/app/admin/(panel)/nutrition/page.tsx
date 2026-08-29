"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Spinner } from "@/components/ui";

type NutritionItem = {
  id: number;
  nutrient: string;
  insight?: string;
  food_suggestions?: string[];
  caution_text?: string;
  is_active: boolean;
};

type NutritionForm = {
  nutrient: string;
  insight: string;
  food_list: string;
  caution_text: string;
  is_active: boolean;
};

const EMPTY: NutritionForm = { nutrient: "", insight: "", food_list: "", caution_text: "", is_active: true };

export default function AdminNutritionPage() {
  const [items, setItems] = useState<NutritionItem[] | null>(null);
  const [err, setErr] = useState("");
  const [form, setForm] = useState<NutritionForm>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = () => api<{ nutrition: NutritionItem[] }>("/api/admin/nutrition").then((d) => setItems(d.nutrition)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const set = (k: Exclude<keyof NutritionForm, "is_active">) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const body = {
      nutrient: form.nutrient,
      insight: form.insight,
      caution_text: form.caution_text,
      is_active: form.is_active,
      food_suggestions: form.food_list.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (editingId) await api(`/api/admin/nutrition/${editingId}`, { method: "PUT", body });
      else await api("/api/admin/nutrition", { method: "POST", body });
      setForm(EMPTY); setEditingId(null); load();
    } catch (ex) { setErr((ex as Error).message); }
  };

  const edit = (n: NutritionItem) => {
    setEditingId(n.id);
    setForm({ nutrient: n.nutrient, insight: n.insight || "", food_list: (n.food_suggestions || []).join("\n"), caution_text: n.caution_text || "", is_active: n.is_active });
  };
  const remove = async (n: NutritionItem) => { if (!window.confirm(`Delete ${n.nutrient}?`)) return; await api(`/api/admin/nutrition/${n.id}`, { method: "DELETE" }); load(); };

  if (err) return <div className="alert alert-danger">{err}</div>;
  if (!items) return <Spinner />;

  return (
    <div>
      <h1 className="page-title">Nutrition Management</h1>
      <p className="page-sub">Nutritional insights, food suggestions and general information.</p>

      <div className="grid grid-2">
        <div className="card">
          <h3>{editingId ? "Edit entry" : "Add entry"}</h3>
          <form onSubmit={submit}>
            <div className="field">
              <label>Nutrient / topic</label>
              <input className="input" required value={form.nutrient} onChange={set("nutrient")} />
            </div>
            <div className="field">
              <label>Insight text (never claim a confirmed deficiency)</label>
              <textarea className="textarea" rows={3} value={form.insight} onChange={set("insight")} />
            </div>
            <div className="field">
              <label>Food suggestions (one per line)</label>
              <textarea className="textarea" rows={4} value={form.food_list} onChange={set("food_list")} />
            </div>
            <div className="field">
              <label>Caution text (optional)</label>
              <input className="input" value={form.caution_text} onChange={set("caution_text")} />
            </div>
            <label className="check-row mb-2">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active
            </label>
            <div className="flex-center">
              <button className="btn btn-primary" type="submit">{editingId ? "Save changes" : "Add entry"}</button>
              {editingId && <button className="btn btn-outline" onClick={() => { setEditingId(null); setForm(EMPTY); }}>Cancel</button>}
            </div>
          </form>
        </div>

        <div className="card">
          <h3 className="mb-2">Nutrition catalogue</h3>
          {items.map((n) => (
            <div key={n.id} style={{ borderBottom: "1px solid var(--slate-200)", padding: "0.6rem 0" }}>
              <div className="flex-between">
                <b>{n.nutrient}</b>
                <div className="flex-center">
                  {!n.is_active && <span className="badge badge-slate">Hidden</span>}
                  <button className="btn btn-outline btn-sm" onClick={() => edit(n)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(n)}>Delete</button>
                </div>
              </div>
              <p className="small muted">{n.insight}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}