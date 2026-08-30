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

  const res = await fetch(path.startsWith("http") ? path : `${API_BASE}${path}`, opts);
  if (isBlob) return res as unknown as T;
  return handle<T>(res);
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