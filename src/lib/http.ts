import { NextRequest, NextResponse } from "next/server";
import { getSession, Session } from "./auth";

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data as Record<string, unknown>, { status });
}

export function jsonError(
  error: string,
  status = 400,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ error, ...(extra || {}) }, { status });
}

export type JsonBody = Record<string, unknown>;

export async function readJson(req: Request): Promise<JsonBody> {
  try {
    const body = await req.json();
    return (body && typeof body === "object" ? body : {}) as JsonBody;
  } catch {
    return {};
  }
}

export async function requireAuth(): Promise<Session | NextResponse> {
  const session = await getSession();
  if (!session) return jsonError("Authentication required.", 401);
  return session;
}

export async function requireAdmin(): Promise<Session | NextResponse> {
  const session = await getSession();
  if (!session) return jsonError("Authentication required.", 401);
  if (session.role !== "admin") return jsonError("Admin access required.", 403);
  return session;
}

export function isError(v: unknown): v is NextResponse {
  return v instanceof NextResponse;
}