"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

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
      setUser(data.user as AuthUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api("/api/auth/login", { method: "POST", body: { email, password } });
    setUser(data.user as AuthUser);
    return data.user as AuthUser;
  }, []);

  const adminLogin = useCallback(async (email: string, password: string) => {
    const data = await api("/api/admin/login", { method: "POST", body: { email, password } });
    setUser(data.user as AuthUser);
    return data.user as AuthUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
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