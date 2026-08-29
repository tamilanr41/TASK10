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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [search, setSearch] = useState("");
  const [err, setErr] = useState("");

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

  if (err) return <div className="alert alert-danger">{err}</div>;
  if (!users) return <Spinner />;

  return (
    <div>
      <div className="flex-between mb-2">
        <h1 className="page-title">User Management</h1>
        <input className="input" style={{ width: 260 }} placeholder="Search by name or email…" value={search} onChange={(e) => { setSearch(e.target.value); load(e.target.value); }} />
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
  );
}