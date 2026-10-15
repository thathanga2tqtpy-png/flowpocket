import { apiRequest } from "@/lib/api-client";

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  status: string;
  created_at: string;
}

export const authService = {
  getMe: async () => {
    return apiRequest<AuthUser>("/api/v1/auth/me");
  },

  login: async (email: string, password: string) => {
    return apiRequest<{ user: AuthUser }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (email: string, password: string, display_name: string) => {
    return apiRequest<{ user: AuthUser }>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, display_name }),
    });
  },

  logout: async () => {
    return apiRequest<void>("/api/v1/auth/logout", {
      method: "POST",
    });
  },

  revokeAllSessions: async () => {
    return apiRequest<{ message: string }>("/api/v1/auth/revoke-all", {
      method: "POST",
    });
  },
};

