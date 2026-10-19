import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import * as authService from "../lib/services/auth.js";

const AuthContext = createContext(null);

const SESSION_EXPIRED_EVENT = "speedin:session-expired";

/** Called by the API layer on a 401; AuthProvider then signs out locally. */
export function notifySessionExpired() {
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

// status: "loading" while the session is checked on startup, then "authenticated" or "anonymous".
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: "loading", user: null });
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    authService
      .me()
      .then((user) => !cancelled && setState({ status: "authenticated", user }))
      .catch(() => !cancelled && setState({ status: "anonymous", user: null }));
    return () => {
      cancelled = true;
    };
  }, []);

  // Session expired while using the app: drop cached data and go back to the login page.
  // ProtectedRoute keeps the current page in `from`, so the user returns to it after signing in.
  useEffect(() => {
    const onExpired = () => {
      queryClient.clear();
      setState((current) => (current.status === "authenticated" ? { status: "anonymous", user: null } : current));
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [queryClient]);

  const login = useCallback(async (email, password) => {
    const user = await authService.login(email, password);
    // Never show a previous user's cached data to the next one on a shared device
    queryClient.clear();
    setState({ status: "authenticated", user });
    return user;
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      // Sign out locally even if the request fails, so the user is never stuck signed in.
      queryClient.clear();
      setState({ status: "anonymous", user: null });
    }
  }, [queryClient]);

  const value = useMemo(() => ({ ...state, login, logout }), [state, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
