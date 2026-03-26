import React, { createContext, useContext, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { createApiClient } from "../services/apiClient";

const STORAGE_KEY = "oee.auth.v1";

function safeDecode(token) {
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

function store(value) {
  try {
    if (!value) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
}

const AuthContext = createContext(null);

// PUBLIC_INTERFACE
export function AuthProvider({ children }) {
  /** Provides authentication and role information across the app. */
  const [session, setSession] = useState(() => loadStored());

  const token = session?.token || "";
  const claims = useMemo(() => (token ? safeDecode(token) : null), [token]);

  const user = useMemo(() => {
    if (session?.user) return session.user;
    if (!claims) return null;
    return {
      id: claims.sub || claims.user_id || "unknown",
      name: claims.name || claims.email || "User",
      email: claims.email,
    };
  }, [claims, session?.user]);

  const role = session?.role || claims?.role || "operator";

  const api = useMemo(
    () =>
      createApiClient({
        getToken: () => token,
      }),
    [token]
  );

  // PUBLIC_INTERFACE
  const login = async ({ email, password, role: chosenRole }) => {
    /**
     * Logs in using backend if available; otherwise uses a local mock session.
     * Returns {ok, error?}.
     */
    try {
      const res = await api.authLogin({ email, password });
      const next = {
        token: res?.token || res?.access_token || "",
        user: res?.user || { name: email?.split("@")?.[0] || "User", email },
        role: res?.role || chosenRole || "operator",
      };
      // If backend did not return token, still store session to allow UI navigation.
      setSession(next);
      store(next);
      return { ok: true };
    } catch (e) {
      // fallback mock: allow sign-in for demo purposes
      const mock = {
        token: "",
        user: { name: email?.split("@")?.[0] || "User", email },
        role: chosenRole || "operator",
      };
      setSession(mock);
      store(mock);
      return { ok: true, warning: "Backend login unavailable; using demo session." };
    }
  };

  // PUBLIC_INTERFACE
  const logout = () => {
    /** Clears local session and returns to login. */
    setSession(null);
    store(null);
  };

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(session),
      token,
      user,
      role,
      api,
      login,
      logout,
    }),
    [api, role, session, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// PUBLIC_INTERFACE
export function useAuth() {
  /** Hook to access auth context. */
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
