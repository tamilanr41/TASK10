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
};

const EMPTY: UserForm = { name: "", email: "", password: "", confirm_password: "", role: "user" };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [search, setSearch] = useState("");
  const [err, setErr] = useState("");
  const [form, setForm] = useState<UserForm>(EMPTY);
  const [formErr, setFormErr] = useState("");
  const [saved, setSaved] = useState(false);

  const load = (q = "") => {
    api<{ users: AdminUser[] }>(`/api/admin/users${q ? `?search=${encodeURIComponent(q)}` : ""}`)
      .then((d) => setUsers(d.users))
      .catch((e) => setErr(e.message));
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (u: AdminUser) => {
    await api(`/api/admin/users/${u.id}/status`, { method: "PUT", body: { is_active: !u.is_active } });
    load(search);
  };

  const set = (k: Exclude<keyof UserForm, "role">) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErr("");
    setSaved(false);
    try {
      await api("/api/admin/users", { method: "POST", body: form });
      setForm(EMPTY);
      setSaved(true);
      load(search);
    } catch (ex) {
      const f = (ex as { fields?: Record<string, string> }).fields;
      if (f) setFormErr(Object.values(f)[0] || (ex as Error).message);
      else setFormErr((ex as Error).message);
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
          <h3>Add user</h3>
          <p className="small muted mb-2">Create a new account with a specific role.</p>
          {formErr && <div className="alert alert-danger">{formErr}</div>}
          {saved && <div className="alert alert-success">User created successfully.</div>}
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
              <div />
            </div>
            <div className="field">
              <label>Password</label>
              <input className="input" type="password" required minLength={8} value={form.password} onChange={set("password")} />
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input className="input" type="password" required minLength={8} value={form.confirm_password} onChange={set("confirm_password")} />
            </div>
            <p className="small muted mb-2">Password needs 8+ characters, one uppercase letter and one number.</p>
            <div className="flex-center">
              <button className="btn btn-primary" type="submit">Create user</button>
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
              <th>Joined</th>
              <th>Status</th>
              <th>Action</th>
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
                <td className="muted">{u.created_at}</td>
                <td>
                  <span className={`badge ${u.is_active ? "badge-low" : "badge-high"}`}>
                    {u.is_active ? "Active" : "Disabled"}
                  </span>
                </td>
                <td>
                  <button className={`btn btn-sm ${u.is_active ? "btn-danger" : "btn-secondary"}`} onClick={() => toggle(u)}>
                    {u.is_active ? "Disable" : "Enable"}
                  </button>
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