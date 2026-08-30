export const DISCLAIMER_TEXT =
  "DermAI is an AI-assisted screening tool developed for educational and preliminary assessment purposes only. It does not provide a medical diagnosis and should not replace consultation with a qualified dermatologist or healthcare professional.";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

type ApiOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  isBlob?: boolean;
};

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem("dermai_token");
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem("dermai_token", token);
    else window.localStorage.removeItem("dermai_token");
  } catch {
    /* ignore */
  }
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle<T>(res: Response): Promise<T> {
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const err = new Error(
      (data && (data as Record<string, unknown>).error) ||
        (data && (data as Record<string, unknown>).message) ||
        `Request failed (${res.status})`
    ) as Error & { status?: number; fields?: unknown };
    err.status = res.status;
    err.fields = data && (data as Record<string, unknown>).fields;
    throw err;
  }
  return data as T;
}

export async function api<T = Record<string, unknown>>(
  path: string,
  { method = "GET", body, headers, isBlob }: ApiOptions = {}
): Promise<T> {
  const opts: RequestInit = { method, headers: { ...authHeaders(), ...(headers || {}) } };
  if (body !== undefined) {
    opts.headers = { ...opts.headers, "Content-Type": "application/json" };
    opts.body = JSON.stringify(body);
  }

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  if (method === "GET" && !isBlob) {
    const key = `${url}|${getAuthToken() || ""}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data as T;
    const res = await fetch(url, opts);
    const data = await handle<T>(res);
    cache.set(key, { at: Date.now(), data });
    return data;
  }

  const res = await fetch(url, opts);
  if (isBlob) return res as unknown as T;
  const data = await handle<T>(res);
  if (method !== "GET") cache.clear();
  return data;
}

const CACHE_TTL = 10_000;
const cache = new Map<string, { at: number; data: unknown }>();

export function getCachedUser(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("dermai_user");
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function setCachedUser(user: Record<string, unknown> | null): void {
  if (typeof window === "undefined") return;
  try {
    if (user) window.localStorage.setItem("dermai_user", JSON.stringify(user));
    else window.localStorage.removeItem("dermai_user");
  } catch {
    /* ignore */
  }
}

export function assetUrl(rel: string | null | undefined): string {
  if (!rel) return "";
  if (rel.startsWith("http://") || rel.startsWith("https://")) return rel;
  return `${API_BASE}${rel.startsWith("/") ? "" : "/"}${rel}`;
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}