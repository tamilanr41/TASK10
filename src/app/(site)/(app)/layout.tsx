"use client";

import { Protected } from "@/components/guards";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Protected>{children}</Protected>;
}