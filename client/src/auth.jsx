import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api
      .me()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  const signIn = useCallback(() => {
    try {
      sessionStorage.setItem("lh.returnTo", window.location.pathname + window.location.search);
    } catch {
      // Private mode: we just land on the home page afterwards.
    }
    window.location.href = "/auth/google";
  }, []);

  const signOut = useCallback(async () => {
    await api.logout().catch(() => {});
    setUser(null);
    window.location.href = "/";
  }, []);

  const value = useMemo(
    () => ({ user, ready, setUser, signIn, signOut }),
    [user, ready, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
