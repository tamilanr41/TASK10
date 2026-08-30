"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  screening: "Screening",
  result: "Result",
  history: "History",
  compare: "Compare",
  doctors: "Dermatologists",
  nutrition: "Nutrition",
  reminders: "Reminders",
  settings: "Settings",
  profile: "Profile",
  chat: "AI Assistant",
  users: "Users",
  screenings: "Screenings",
  conditions: "Conditions",
  recommendations: "Recommendations",
};

type Crumb = { label: string; href?: string };

export function Breadcrumbs({ root }: { root?: { href: string; label: string } }) {
  const pathname = usePathname();
  const home = root ?? { href: "/dashboard", label: "Home" };
  const segs = pathname.split("/").filter(Boolean);
  if (!segs.length) return null;

  const crumbs: Crumb[] = [{ label: home.label, href: home.href }];
  const parts = segs.slice();
  const homeTail = home.href.split("/").filter(Boolean).pop();
  if (parts[0] === homeTail) parts.shift();

  const onHomePath =
    `/${segs.join("/")}` === home.href ||
    segs.length === 0 ||
    (parts.length === 0 && segs.length === 1 && segs[0] === homeTail);

  if (onHomePath && segs.length) {
    const here = LABELS[segs[segs.length - 1]] ?? segs[segs.length - 1];
    crumbs.push({ label: here });
    return (
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <CrumbItem key={i} c={c} first={i === 0} />
        ))}
      </nav>
    );
  }

  let acc = home.href.replace(/\/+$/, "");
  parts.forEach((s, i) => {
    const label = LABELS[s] ?? (/^\d+$/.test(s) ? `#${s}` : s);
    const isLast = i === parts.length - 1;
    if (!isLast) acc += `/${s}`;
    crumbs.push({ label, href: isLast ? undefined : acc });
  });

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {crumbs.map((c, i) => (
        <CrumbItem key={i} c={c} first={i === 0} />
      ))}
    </nav>
  );
}

function CrumbItem({ c, first }: { c: Crumb; first: boolean }) {
  return (
    <span className="crumb">
      {!first && <span className="crumb-sep">›</span>}
      {c.href ? (
        <Link href={c.href} className="crumb-link">
          {c.label}
        </Link>
      ) : (
        <span className="crumb-here">{c.label}</span>
      )}
    </span>
  );
}