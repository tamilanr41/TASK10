"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Spinner } from "@/components/ui";

type AdminDoctor = {
  id: number;
  name: string;
  specialization?: string;
  clinic?: string;
  location?: string;
  contact?: string;
  availability?: string;
  consultation_info?: string;
  city?: string;
  is_sample: boolean;
};

type DoctorForm = {
  name: string;
  specialization: string;
  clinic: string;
  location: string;
  contact: string;
  availability: string;
  consultation_info: string;
  city: string;
  is_sample: boolean;
};

const EMPTY: DoctorForm = { name: "", specialization: "Dermatology", clinic: "", location: "", contact: "", availability: "", consultation_info: "", city: "", is_sample: true };

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<AdminDoctor[] | null>(null);
  const [err, setErr] = useState("");
  const [form, setForm] = useState<DoctorForm>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = () => {
    api<{ doctors: AdminDoctor[] }>("/api/admin/doctors")
      .then((d) => setDoctors(d.doctors))
      .catch((e) => setErr(e.message));
  };

  useEffect(load, []);

  const set = (k: Exclude<keyof DoctorForm, "is_sample">) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (editingId) await api(`/api/admin/doctors/${editingId}`, { method: "PUT", body: form });
      else await api("/api/admin/doctors", { method: "POST", body: form });
      setForm(EMPTY);
      setEditingId(null);
      load();
    } catch (ex) {
      setErr((ex as Error).message);
    }
  };

  const edit = (d: AdminDoctor) => {
    setEditingId(d.id);
    setForm({
      name: d.name, specialization: d.specialization || "", clinic: d.clinic || "",
      location: d.location || "", contact: d.contact || "", availability: d.availability || "",
      consultation_info: d.consultation_info || "", city: d.city || "", is_sample: d.is_sample,
    });
  };

  const remove = async (d: AdminDoctor) => {
    if (!window.confirm(`Delete ${d.name}?`)) return;
    await api(`/api/admin/doctors/${d.id}`, { method: "DELETE" });
    load();
  };

  if (err) return <div className="alert alert-danger">{err}</div>;
  if (!doctors) return <Spinner />;

  return (
    <div>
      <h1 className="page-title">Doctor Management</h1>
      <p className="page-sub">Add, edit or remove dermatology providers.</p>

      <div className="grid grid-2">
        <div className="card">
          <h3>{editingId ? "Edit doctor" : "Add doctor"}</h3>
          <form onSubmit={submit}>
            <div className="field">
              <label>Name</label>
              <input className="input" required value={form.name} onChange={set("name")} />
            </div>
            <div className="field">
              <label>Specialization</label>
              <input className="input" value={form.specialization} onChange={set("specialization")} />
            </div>
            <div className="grid grid-2">
              <div className="field">
                <label>City</label>
                <input className="input" value={form.city} onChange={set("city")} />
              </div>
              <div className="field">
                <label>Clinic/hospital</label>
                <input className="input" value={form.clinic} onChange={set("clinic")} />
              </div>
            </div>
            <div className="field">
              <label>Location</label>
              <input className="input" value={form.location} onChange={set("location")} />
            </div>
            <div className="grid grid-2">
              <div className="field">
                <label>Contact</label>
                <input className="input" value={form.contact} onChange={set("contact")} />
              </div>
              <div className="field">
                <label>Availability</label>
                <input className="input" value={form.availability} onChange={set("availability")} />
              </div>
            </div>
            <div className="field">
              <label>Consultation info</label>
              <input className="input" value={form.consultation_info} onChange={set("consultation_info")} />
            </div>
            <label className="check-row mb-2">
              <input type="checkbox" checked={form.is_sample} onChange={(e) => setForm({ ...form, is_sample: e.target.checked })} />
              Mark as sample/placeholder record
            </label>
            <div className="flex-center">
              <button className="btn btn-primary" type="submit">{editingId ? "Save changes" : "Add doctor"}</button>
              {editingId && <button className="btn btn-outline" type="button" onClick={() => { setEditingId(null); setForm(EMPTY); }}>Cancel</button>}
            </div>
          </form>
        </div>

        <div className="card">
          <h3 className="mb-2">Doctor list</h3>
          {doctors.length === 0 ? (
            <p className="small muted">No doctors yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>City</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((d) => (
                  <tr key={d.id}>
                    <td>{d.name}</td>
                    <td>{d.city || "—"}</td>
                    <td>{d.is_sample ? <span className="badge badge-demo">Sample</span> : <span className="badge badge-low">Verified</span>}</td>
                    <td>
                      <div className="flex-center">
                        <button className="btn btn-outline btn-sm" onClick={() => edit(d)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(d)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}