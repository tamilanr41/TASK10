"use client";

import { Protected } from "@/components/guards";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <Breadcrumbs />
      {children}
    </Protected>
  );
}