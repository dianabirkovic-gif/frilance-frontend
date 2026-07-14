import { useCallback, useState } from "react";
import * as authApi from "../api/auth";
import {
  getStoredAccessToken,
  getStoredUser,
  setStoredAccessToken,
  setStoredUser,
  type StoredUser,
} from "../api/client";

/**
 * Deliberately minimal: token + user profile in localStorage, no refresh
 * flow (matches the backend's single-access-token simplification — see
 * backend CLAUDE.md). Replace with a context if more than one component
 * needs to react to login/logout; for now AppShell/RequireAuth are the only
 * consumers.
 */
export function useAuth() {
  const [accessToken, setAccessToken] = useState<string | null>(getStoredAccessToken);
  const [user, setUser] = useState<StoredUser | null>(getStoredUser);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    const storedUser: StoredUser = { fullName: response.fullName, role: response.role };
    setStoredAccessToken(response.accessToken);
    setStoredUser(storedUser);
    setAccessToken(response.accessToken);
    setUser(storedUser);
    return response;
  }, []);

  const logout = useCallback(() => {
    setStoredAccessToken(null);
    setStoredUser(null);
    setAccessToken(null);
    setUser(null);
  }, []);

  return { accessToken, user, isAuthenticated: accessToken !== null, login, logout };
}
