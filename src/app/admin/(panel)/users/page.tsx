"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Spinner } from "@/components/ui";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  screening_count?: number;
  created_at?: string;
  is_active: boolean;
};

type UserForm = {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
  role: string;
  age: string;
  sex: string;
};

const EMPTY: UserForm = {
  name: "",
  email: "",
  password: "",
  confirm_password: "",
  role: "user",
  age: "",
  sex: "",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [search, setSearch] = useState("");
  const [err, setErr] = useState("");
  const [form, setForm] = useState<UserForm>(EMPTY);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [formErr, setFormErr] = useState("");
  const [formOk, setFormOk] = useState("");
  const [busy, setBusy] = useState(false);

  const load = (q = "") => {
    api<{ users: AdminUser[] }>(`/api/admin/users${q ? `?search=${encodeURIComponent(q)}` : ""}`)
      .then((d) => setUsers(d.users))
      .catch((e) => setErr(e.message));
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (u: AdminUser) => {
    try {
      await api(`/api/admin/users/${u.id}/status`, { method: "PUT", body: { is_active: !u.is_active } });
      load(search);
    } catch (e) {
      setFormErr((e as Error).message);
    }
  };

  const remove = async (u: AdminUser) => {
    if (!window.confirm(`Delete "${u.name}" (${u.email}) and all of their data? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/users/${u.id}`, { method: "DELETE" });
      if (editing?.id === u.id) resetForm();
      load(search);
    } catch (e) {
      setFormErr((e as Error).message);
    }
  };

  const startEdit = (u: AdminUser) => {
    setEditing(u);
    setFormErr("");
    setFormOk("");
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      confirm_password: "",
      role: u.role,
      age: "",
      sex: "",
    });
  };

  const resetForm = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormOk("");
  };

  const set = (k: Exclude<keyof UserForm, "role" | "sex">) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErr("");
    setFormOk("");
    setBusy(true);
    try {
      const body = editing
        ? { name: form.name, email: form.email, password: form.password, role: form.role, age: form.age, sex: form.sex }
        : { ...form, age: form.age, sex: form.sex };
      const res = editing
        ? await api<{ message: string }>(`/api/admin/users/${editing.id}`, { method: "PUT", body })
        : await api<{ message: string }>("/api/admin/users", { method: "POST", body });
      setFormOk(res.message || (editing ? "User updated." : "User created."));
      if (editing) resetForm();
      else setForm(EMPTY);
      load(search);
    } catch (ex) {
      const f = (ex as { fields?: Record<string, string> }).fields;
      if (f) setFormErr(Object.values(f)[0] || (ex as Error).message);
      else setFormErr((ex as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (err) return <div className="alert alert-danger">{err}</div>;
  if (!users) return <Spinner />;

  return (
    <div>
      <div className="flex-between mb-2">
        <h1 className="page-title">User Management</h1>
        <input className="input" style={{ width: 260 }} placeholder="Search by name or email…" value={search} onChange={(e) => { setSearch(e.target.value); load(e.target.value); }} />
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>{editing ? `Edit user #${editing.id}` : "Add user"}</h3>
          <p className="small muted mb-2">
            {editing ? `Editing ${editing.name} · leave password blank to keep it.` : "Create a new account with a specific role."}
          </p>
          {formErr && <div className="alert alert-danger">{formErr}</div>}
          {formOk && <div className="alert alert-success">{formOk}</div>}
          <form onSubmit={submit}>
            <div className="field">
              <label>Full name</label>
              <input className="input" required minLength={2} value={form.name} onChange={set("name")} />
            </div>
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" required value={form.email} onChange={set("email")} />
            </div>
            <div className="grid grid-2">
              <div className="field">
                <label>Role</label>
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="user">User</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="field">
                <label>Sex</label>
                <select className="input" value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
                  <option value="">—</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Age</label>
              <input className="input" type="number" min={1} max={120} placeholder="Optional" value={form.age} onChange={set("age")} />
            </div>
            <div className="field">
              <label>{editing ? "New password (optional)" : "Password"}</label>
              <input className="input" type="password" required={!editing} minLength={8} value={form.password} onChange={set("password")} />
            </div>
            {!editing && (
              <div className="field">
                <label>Confirm password</label>
                <input className="input" type="password" required minLength={8} value={form.confirm_password} onChange={set("confirm_password")} />
              </div>
            )}
            <p className="small muted mb-2">Password needs 8+ characters, one uppercase letter and one number.</p>
            <div className="flex-center" style={{ gap: "0.5rem" }}>
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? "Saving…" : editing ? "Save changes" : "Create user"}
              </button>
              {editing && (
                <button className="btn btn-secondary" type="button" onClick={resetForm}>Cancel</button>
              )}
            </div>
          </form>
        </div>

        <div className="card">
          <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Screenings</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.name}</td>
                <td className="muted">{u.email}</td>
                <td>{u.role}</td>
                <td>{u.screening_count}</td>
                <td>
                  <span className={`badge ${u.is_active ? "badge-low" : "badge-high"}`}>
                    {u.is_active ? "Active" : "Disabled"}
                  </span>
                </td>
                <td>
                  <div className="flex" style={{ gap: "0.35rem", flexWrap: "wrap" }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => startEdit(u)}>Edit</button>
                    <button className={`btn btn-sm ${u.is_active ? "btn-danger" : "btn-secondary"}`} onClick={() => toggle(u)}>
                      {u.is_active ? "Disable" : "Enable"}
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(u)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}