"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";

export interface User {
  id: string;
  email: string;
  display_name: string;
  status: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, display_name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  revokeAllSessions: () => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await apiRequest<User>("/api/v1/auth/me");
      if (res.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiRequest<{ user: User }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (res.data?.user) {
      setUser(res.data.user);
      return { success: true };
    }
    return { success: false, error: res.error || "Đăng nhập thất bại" };
  };

  const register = async (email: string, password: string, display_name: string) => {
    const res = await apiRequest<{ user: User }>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, display_name }),
    });

    if (res.data?.user) {
      setUser(res.data.user);
      return { success: true };
    }
    return { success: false, error: res.error || "Đăng ký thất bại" };
  };

  const logout = async () => {
    try {
      await apiRequest("/api/v1/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      if (typeof window !== "undefined") {
        sessionStorage.clear();
      }
    }
  };

  const revokeAllSessions = async () => {
    const res = await apiRequest<{ message: string }>("/api/v1/auth/revoke-all", {
      method: "POST",
    });
    if (res.data) {
      setUser(null);
      return { success: true, message: res.data.message };
    }
    return { success: false, message: res.error || "Thu hồi phiên thất bại" };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        refreshUser,
        login,
        register,
        logout,
        revokeAllSessions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

