import { useCallback, useEffect, useState } from "react";
import * as api from "../services/api";

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.publicLogin()
      .then(setToken)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (identifier: string, password: string, useEmail = false) => {
    const nextToken = await api.login(identifier, password, useEmail);
    setToken(nextToken);
  }, []);

  const signOut = useCallback(async () => {
    if (token) await api.logout(token);
    setToken(null);
  }, [token]);

  const expireSession = useCallback(async () => {
    await api.clearStoredToken();
    setToken(null);
  }, []);

  return { token, loading, signIn, signOut, expireSession };
}
