import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import * as authService from "../lib/services/auth.js";

const AuthContext = createContext(null);

// status: "loading" while the session is checked on startup, then "authenticated" or "anonymous".
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: "loading", user: null });

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

  const login = useCallback(async (email, password) => {
    const { user } = await authService.login(email, password);
    setState({ status: "authenticated", user });
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      // Sign out locally even if the request fails, so the user is never stuck signed in.
      setState({ status: "anonymous", user: null });
    }
  }, []);

  const value = useMemo(() => ({ ...state, login, logout }), [state, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
