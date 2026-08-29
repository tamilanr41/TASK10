import { cookies } from "next/headers";
import * as jose from "jose";
import bcrypt from "bcryptjs";

const SECRET = new TextEncoder().encode(
  process.env.DERMAI_JWT_SECRET || "dermai-jwt-dev-secret-key-please-change-now"
);

const COOKIE = "dermai_token";

export type Session = {
  userId: number;
  role: string;
};

export async function signToken(userId: number, role: string): Promise<string> {
  return await new jose.SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jose.jwtVerify(token, SECRET);
    const userId = Number(payload.sub);
    if (!userId) return null;
    return { userId, role: String(payload.role || "user") };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const store = cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function checkPassword(hash: string, password: string): boolean {
  return bcrypt.compareSync(password, hash);
}