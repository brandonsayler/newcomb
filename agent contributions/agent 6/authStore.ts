/**
 * AGENT 6 — Auth State Store
 * ===========================
 * Client-side auth state that wraps Agent 2's authentication service.
 * Manages JWT tokens, current user, and session lifecycle.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "./taskStore";

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) throw new Error("Invalid credentials");
        const { token, user } = await res.json();
        localStorage.setItem("auth_token", token);
        set({ user, token, isAuthenticated: true, isLoading: false });
      },

      signup: async (name, email, password) => {
        set({ isLoading: true });
        const res = await fetch(`${API_BASE}/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        if (!res.ok) throw new Error("Signup failed");
        const { token, user } = await res.json();
        localStorage.setItem("auth_token", token);
        set({ user, token, isAuthenticated: true, isLoading: false });
      },

      logout: () => {
        localStorage.removeItem("auth_token");
        set({ user: null, token: null, isAuthenticated: false });
      },

      refreshUser: async () => {
        const token = get().token;
        if (!token) return;
        try {
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error();
          const user = await res.json();
          set({ user, isAuthenticated: true });
        } catch {
          get().logout();
        }
      },
    }),
    {
      name: "kanban-auth",
      partialize: (state) => ({ token: state.token }),
      onRehydrate: () => (state) => {
        // Auto-refresh user on app load
        state?.refreshUser();
      },
    }
  )
);
