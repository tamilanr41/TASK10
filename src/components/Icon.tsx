"use client";

const PATHS: Record<string, React.ReactNode> = {
  scalp: (
    <>
      <path d="M4 14c3-1.5 6-2.5 9.5-3.5M9 10.5c3-1.5 6-2.5 9.5-3.5M14 7c3-1.5 6-2.5 9.5-3.5" strokeLinecap="round" />
      <path d="M3 16h18M3 20h18" strokeLinecap="round" />
      <circle cx="16" cy="17" r="2.4" />
    </>
  ),
  nails: (
    <>
      <path d="M9 3.5l5-.7c2.3-.2 4 .4 4.5 2 .6 1.7-.7 3.6-1.9 5-.7.8-1.2 1.7-1.6 2.8-.5 1.4-1.6 3-3.3 4-1.3.8-3.2 1-4.5.2-1-.6-1.2-1.7-1.3-3l-.4-6c-.1-1.6-.1-3.3 1-4.3C7.8 4 8.5 3.7 9 3.5z" />
      <path d="M13.5 5v11M9.5 9.5c1.3.2 2.7.1 4-.3" />
    </>
  ),
  link: (
    <>
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="16" r="3" />
      <path d="M10.5 10.5L13.5 13.5" />
    </>
  ),
  quiz: (
    <>
      <path d="M4 4h16v12h-9l-4 3v-3H4z" />
      <path d="M9 8.5c.3-1.2 1.5-2 3-2s2.7.8 2.7 2c0 1.4-1.6 1.7-2.2 2.6-.4.6-.4 1.3-.4 1.9" strokeLinecap="round" />
      <circle cx="12.3" cy="15" r=".3" fill="currentColor" />
    </>
  ),
  chat: (
    <>
      <path d="M4 5h16v11h-7l-4 3v-3H4z" />
      <path d="M8 9h8M8 12h5" strokeLinecap="round" />
    </>
  ),
  nutrition: (
    <>
      <path d="M12 21c-3.5 0-6-3.5-6-8 0-5 2.5-9 6-9s6 4 6 9c0 4.5-2.5 8-6 8z" />
      <path d="M9 17c.5-3 1.8-5 3-6C11 12 9.7 14 9 17zM15 17c-.5-3-1.8-5-3-6 2 1 3.3 3 4 6z" />
    </>
  ),
  doctor: (
    <>
      <circle cx="12" cy="8" r="4.5" />
      <path d="M4.5 19c.4-3.5 3.6-6 7.5-6s7.1 2.5 7.5 6" />
      <path d="M18.5 4.5A2.5 2.5 0 0 1 17 7.5M19.5 3.5a.9.9 0 0 1-1.8 0 .9.9 0 0 1 1.8 0z" />
    </>
  ),
  chart: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M8 16v-4M12 16V8M16 16v-6" strokeLinecap="round" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" strokeLinecap="round" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3.5 19c.3-3 2.9-5 5.5-5s5.2 2 5.5 5" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M16.5 14.3c2.3.3 3.9 2 4.2 4.2" />
    </>
  ),
  folder: (
    <>
      <path d="M3.5 6.5h6l2 2.5h9v10a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1z" />
      <path d="M4 6.5V5a1 1 0 0 1 1-1h5l2 2.5" />
    </>
  ),
  hospital: (
    <>
      <rect x="4" y="3.5" width="16" height="17" rx="2" />
      <path d="M12 8v6M9 11h6" strokeLinecap="round" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  scan: (
    <>
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
      <path d="M7 12h10" strokeLinecap="round" />
    </>
  ),
  log: (
    <>
      <path d="M9 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9" />
      <path d="M4 12h10M11 9l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}