"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { Icon, type IconName } from "@/components/Icon";

const LINKS: { to: string; label: string; icon: IconName }[] = [
  { to: "/admin", label: "Dashboard", icon: "dashboard" },
  { to: "/admin/users", label: "Users", icon: "users" },
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
        <Link href="/admin" className="admin-brand" aria-label="Admin dashboard">
          <img src="/art/brand-mark.svg" alt="" width={26} height={26} />
          DermAI Admin
        </Link>
        {LINKS.map((l) => {
          const isActive = l.to === "/admin" ? pathname === "/admin" : pathname.startsWith(l.to);
          return (
            <Link
              key={l.to}
              href={l.to}
              className={`admin-link ${isActive ? "active" : ""}`}
            >
              <Icon name={l.icon} size={18} />
              {l.label}
            </Link>
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
      <main className="admin-main">{children}</main>
    </div>
  );
}