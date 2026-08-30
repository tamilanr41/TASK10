"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getAuthToken, setAuthToken, getCachedUser, setCachedUser } from "@/lib/api";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  age?: number | null;
  sex?: string | null;
  role: string;
  is_active?: boolean;
  created_at?: string;
  screening_count?: number;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  adminLogin: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api("/api/auth/me");
      const u = data.user as AuthUser;
      setUser(u);
      setCachedUser(u as unknown as Record<string, unknown>);
    } catch {
      setUser(null);
      setCachedUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getAuthToken()) {
      const cached = getCachedUser();
      if (cached) {
        setUser(cached as unknown as AuthUser);
        setLoading(false);
      }
    }
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api("/api/auth/login", { method: "POST", body: { email, password } });
    setAuthToken(data.token as string | null);
    const u = data.user as AuthUser;
    setUser(u);
    setCachedUser(u as unknown as Record<string, unknown>);
    return u;
  }, []);

  const adminLogin = useCallback(async (email: string, password: string) => {
    const data = await api("/api/admin/login", { method: "POST", body: { email, password } });
    setAuthToken(data.token as string | null);
    const u = data.user as AuthUser;
    setUser(u);
    setCachedUser(u as unknown as Record<string, unknown>);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setAuthToken(null);
    setCachedUser(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, adminLogin, logout, refreshUser, isAdmin: user?.role === "admin" }),
    [user, loading, login, adminLogin, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}