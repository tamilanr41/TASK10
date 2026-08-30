"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { Icon, type IconName } from "@/components/Icon";
import { PageFade, motion } from "@/components/motion";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const LINKS: { to: string; label: string; icon: IconName }[] = [
  { to: "/admin", label: "Dashboard", icon: "dashboard" },
  { to: "/admin/users", label: "Users", icon: "users" },
  { to: "/admin/screenings", label: "Screenings", icon: "scan" },
  { to: "/admin/doctors", label: "Doctors", icon: "hospital" },
  { to: "/admin/conditions", label: "Conditions", icon: "folder" },
  { to: "/admin/nutrition", label: "Nutrition", icon: "nutrition" },
  { to: "/admin/recommendations", label: "Recommendations", icon: "quiz" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <motion.div initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <Link href="/admin" className="admin-brand" aria-label="Admin dashboard">
            <img src="/art/brand-mark.svg" alt="" width={26} height={26} />
            DermAI Admin
          </Link>
        </motion.div>
        {LINKS.map((l, i) => {
          const isActive = l.to === "/admin" ? pathname === "/admin" : pathname.startsWith(l.to);
          return (
            <motion.div
              key={l.to}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.06 * (i + 1), duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href={l.to}
                className={`admin-link ${isActive ? "active" : ""}`}
              >
                <Icon name={l.icon} size={18} />
                {l.label}
              </Link>
            </motion.div>
          );
        })}
        <div className="admin-side-footer">
          <p className="small" style={{ marginTop: "0.8rem", color: "var(--ink-faint)" }}>
            {user?.name}
          </p>
          <button
            onClick={handleLogout}
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 8,
              padding: "0.4rem 0.8rem",
              cursor: "pointer",
              fontSize: "0.85rem",
              marginTop: "0.4rem",
              width: "100%",
            }}
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <PageFade>
          <Breadcrumbs root={{ href: "/admin", label: "Admin" }} />
          {children}
        </PageFade>
      </main>
    </div>
  );
}