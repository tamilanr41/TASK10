"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Spinner, BackLink } from "@/components/ui";

type Preset = {
  title: string;
  description: string;
  time: string;
  freq: string;
};

const PRESETS: Preset[] = [
  { title: "Hydration reminder", description: "Drink some water", time: "20:00", freq: "daily" },
  { title: "Self-care check-in", description: "Review scalp/hair or nail care routine", time: "09:00", freq: "daily" },
  { title: "Follow-up screening", description: "Recheck symptoms / upload follow-up image", time: "10:00", freq: "none" },
  { title: "Doctor consultation", description: "Schedule consultation with a dermatologist", time: "11:00", freq: "none" },
];

type Reminder = {
  id: number;
  title: string;
  description?: string;
  reminder_date?: string;
  reminder_time: string;
  repeat_frequency: string;
  is_enabled: boolean;
};

type ReminderForm = {
  title: string;
  description: string;
  reminder_date: string;
  reminder_time: string;
  repeat_frequency: string;
  is_enabled: boolean;
};

type RemindersResponse = {
  reminders: Reminder[];
};

export default function RemindersPage() {
  const [items, setItems] = useState<Reminder[] | null>(null);
  const [err, setErr] = useState("");
  const [form, setForm] = useState<ReminderForm>({ title: "", description: "", reminder_date: "", reminder_time: "", repeat_frequency: "none", is_enabled: true });
  const [freq, setFreq] = useState("none");

  const load = () => {
    api<RemindersResponse>("/api/reminders")
      .then((d) => setItems(d.reminders))
      .catch((e) => setErr(e.message));
  };

  useEffect(load, []);

  const set = (k: Exclude<keyof ReminderForm, "is_enabled">) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const create = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await api("/api/reminders", { method: "POST", body: form });
      setForm({ title: "", description: "", reminder_date: "", reminder_time: "", repeat_frequency: "none", is_enabled: true });
      setFreq("none");
      load();
    } catch (ex) {
      setErr((ex as Error).message);
    }
  };

  const toggle = async (r: Reminder) => {
    await api(`/api/reminders/${r.id}`, { method: "PUT", body: { is_enabled: !r.is_enabled } });
    load();
  };

  const remove = async (r: Reminder) => {
    if (!window.confirm("Delete this reminder?")) return;
    await api(`/api/reminders/${r.id}`, { method: "DELETE" });
    load();
  };

  const applyPreset = (p: Preset) => {
    setForm({
      title: p.title,
      description: p.description,
      reminder_date: "",
      reminder_time: p.time,
      repeat_frequency: p.freq,
      is_enabled: true,
    });
    setFreq(p.freq);
  };

  return (
    <div className="container page">
      <BackLink to="/dashboard" label="Back to Dashboard" />
      <h1 className="page-title mt-2">Reminder Center</h1>
      <p className="page-sub">
        Set reminders for hydration, self-care, follow-up screenings, symptom
        rechecks and doctor consultations.
      </p>

      {err && <div className="alert alert-danger mb-2">{err}</div>}

      <div className="grid grid-2">
        <div className="card">
          <h3>New reminder</h3>
          <p className="small muted mb-2">Quick templates:</p>
          <div className="flex mb-2" style={{ gap: "0.4rem", flexWrap: "wrap" }}>
            {PRESETS.map((p) => (
              <button key={p.title} type="button" className="btn btn-secondary btn-sm" onClick={() => applyPreset(p)}>
                + {p.title}
              </button>
            ))}
          </div>
          <form onSubmit={create}>
            <div className="field">
              <label>Title</label>
              <input className="input" required value={form.title} onChange={set("title")} placeholder="e.g. Hydration reminder" />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea className="textarea" rows={2} value={form.description} onChange={set("description")} placeholder="What should you do?" />
            </div>
            <div className="grid grid-2">
              <div className="field">
                <label>Date (optional)</label>
                <input type="date" className="input" value={form.reminder_date} onChange={set("reminder_date")} />
              </div>
              <div className="field">
                <label>Time (24h)</label>
                <input type="time" className="input" required value={form.reminder_time} onChange={set("reminder_time")} />
              </div>
            </div>
            <div className="field">
              <label>Repeat frequency</label>
              <select className="select" value={form.repeat_frequency} onChange={(e) => { setFreq(e.target.value); set("repeat_frequency")(e); }}>
                <option value="none">Once</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <button className="btn btn-primary" type="submit">Create reminder</button>
          </form>
        </div>

        <div>
          <h3 className="mb-2">Your reminders</h3>
          {!items ? (
            <Spinner />
          ) : items.length === 0 ? (
            <div className="empty-state card">
              <h3>No reminders yet</h3>
              <p className="small muted">Create one from the form or the quick templates.</p>
            </div>
          ) : (
            <div className="card">
              {items.map((r, i) => (
                <div key={r.id} style={{ borderBottom: i < items.length - 1 ? "1px solid var(--slate-200)" : "none", padding: "0.7rem 0" }}>
                  <div className="flex-between">
                    <div>
                      <b>{r.title}</b>
                      <div className="small muted">
                        {r.reminder_time} {r.reminder_date && `· ${r.reminder_date}`} · repeat: {r.repeat_frequency}
                      </div>
                      {r.description && <div className="small">{r.description}</div>}
                    </div>
                    <div className="flex-center">
                      <span className={`badge ${r.is_enabled ? "badge-low" : "badge-slate"}`}>
                        {r.is_enabled ? "ON" : "OFF"}
                      </span>
                      <button className="btn btn-outline btn-sm" onClick={() => toggle(r)}>
                        {r.is_enabled ? "Disable" : "Enable"}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(r)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="alert alert-info mt-2">
            Prototype notice: browser/device notifications are not sent in the
            background in this build. The backend is structured for future
            push/email integration.
          </div>
        </div>
      </div>
    </div>
  );
}