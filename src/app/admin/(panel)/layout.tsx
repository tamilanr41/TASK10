"use client";

import { AdminRoute } from "@/components/guards";
import AdminShell from "@/components/AdminShell";

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoute>
      <AdminShell>{children}</AdminShell>
    </AdminRoute>
  );
}