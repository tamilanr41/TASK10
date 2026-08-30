"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers";
import { DISCLAIMER_TEXT } from "@/lib/api";

const DARK_ROUTES = ["/login", "/signup"];

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/screening", label: "Screening" },
  { to: "/history", label: "History" },
  { to: "/doctors", label: "Doctors" },
  { to: "/chat", label: "Chatbot" },
];

const USER_MENU = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/profile", label: "Profile" },
  { to: "/history", label: "History" },
  { to: "/settings", label: "Settings" },
];

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
  return <span className="avatar" aria-hidden="true">{initials || "U"}</span>;
}

export function Disclosure({ text = DISCLAIMER_TEXT, className = "" }: { text?: string; className?: string }) {
  return <div className={`alert alert-warn ${className}`}>{text}</div>;
}

export function Kicker({ children }: { children: React.ReactNode }) {
  return <span className="kicker">{children}</span>;
}

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link href={to} className="brand" aria-label="DermAI home">
      <span className="brand-mark">
        <img src="/art/brand-mark.svg" alt="" width={30} height={30} />
      </span>
      <span>
        DermAI
        <span className="brand-sub">derma//lab</span>
      </span>
    </Link>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      {open ? (
        <>
          <path d="M6 6l12 12M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </>
      )}
    </svg>
  );
}

export function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = () => setOpen(false);
  const authed = mounted && user;

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.push("/");
  };

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  const dark = DARK_ROUTES.some((r) => pathname === r);

  return (
    <header className={`navbar ${dark ? "dark" : ""}`}>
      <div className="navbar-inner">
        <Logo />
        <button
          className="mobile-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          <MenuIcon open={open} />
        </button>
        <nav className={`nav-links ${open ? "open" : ""}`}>
          {NAV_LINKS.map((l) => (
            <Link key={l.to} href={l.to} className={`nav-link ${isActive(l.to) ? "active" : ""}`} onClick={close}>
              {l.label}
            </Link>
          ))}
          {authed && (
            <Link href="/dashboard" className={`nav-link ${isActive("/dashboard") ? "active" : ""}`} onClick={close}>
              Dashboard
            </Link>
          )}
          {mounted && isAdmin && <Link href="/admin" className="nav-link" onClick={close}>Admin</Link>}
          {authed ? (
            <div
              className={`user-menu ${menuOpen ? "open" : ""}`}
              onMouseEnter={() => setMenuOpen(true)}
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                className="user-menu-trigger btn btn-ghost btn-sm"
                onClick={() => setMenuOpen((m) => !m)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <Avatar name={user.name || user.email} />
                <span className="user-menu-name">{user.name || user.email}</span>
                <svg className="chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <div className="user-dropdown" role="menu">
                {USER_MENU.map((l) => (
                  <Link key={l.to} href={l.to} className="user-dropdown-item" role="menuitem" onClick={() => { close(); setMenuOpen(false); }}>
                    {l.label}
                  </Link>
                ))}
                <button className="user-dropdown-item user-dropdown-logout" role="menuitem" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link href="/login" className="nav-link" onClick={close}>
                Login
              </Link>
              <Link href="/signup" className="nav-link nav-cta" onClick={close}>
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Logo />
            <p style={{ fontSize: "0.86rem", color: "var(--ink-dim)", margin: "0.2rem 0 0" }}>
              AI-driven multimodal dermatological screening for scalp, hair and
              nail preliminary assessment.
            </p>
            <p style={{ fontFamily: "var(--mono)", fontSize: "0.74rem", color: "var(--ink-faint)", margin: 0 }}>
              <span style={{ color: "var(--green)" }}>●</span> SYSTEM ONLINE · MODE DEMO
            </p>
          </div>
          <div>
            <h4>Navigation</h4>
            <p><Link href="/">Home</Link></p>
            <p><Link href="/about">About</Link></p>
            <p><Link href="/screening">Screening</Link></p>
            <p><Link href="/history">History</Link></p>
          </div>
          <div>
            <h4>Services</h4>
            <p><Link href="/doctors">Doctors</Link></p>
            <p><Link href="/chat">Chatbot</Link></p>
            <p><Link href="/reminders">Reminders</Link></p>
            <p><Link href="/nutrition">Nutrition</Link></p>
          </div>
          <div className="footer-disclaimer">
            <h4>Medical Disclaimer</h4>
            <p className="small" style={{ color: "var(--ink-faint)", fontSize: "0.78rem", marginTop: 0 }}>
              {DISCLAIMER_TEXT}
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} DermAI · Frame work educational project ·
          screening &amp; education use only.
        </div>
      </div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="disclaimer-bar">
        <span className="disclaimer-bar-inner">
          ⚠ DEMO / PROTOTYPE AI ENGINE — educational screening only, never a diagnosis.
        </span>
      </div>
      <main className="app-main">{children}</main>
      <Footer />
    </div>
  );
}

export function SeverityBadge({ severity }: { severity?: string | null }) {
  const s = (severity || "low").toLowerCase();
  return <span className={`badge badge-${s}`}>{severity || "Low"}</span>;
}

export function ModeBadge({ isDemo }: { isDemo?: boolean }) {
  if (!isDemo && isDemo !== undefined) return null;
  return <span className="badge badge-demo">DEMO / PROTOTYPE</span>;
}

export function Spinner() {
  return (
    <div className="loading-block">
      <span className="spinner" />
      <span>Loading…</span>
    </div>
  );
}

export function ConfidenceBar({ value }: { value?: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((value || 0) * 100)));
  return (
    <div>
      <div className={`small muted ${pct >= 50 ? "mt-1" : ""}`}>Confidence: {pct}%</div>
      <div className="confidence-bar">
        <div className="confidence-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="small muted">{sub}</div>}
    </div>
  );
}

export function BackLink({ to = "/dashboard", label = "Back to Dashboard" }: { to?: string; label?: string }) {
  return (
    <Link href={to} className="skip-link">
      ← {label}
    </Link>
  );
}