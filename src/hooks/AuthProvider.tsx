import { createContext, useCallback, useEffect, useState, type ReactNode } from "react";
import * as authApi from "../api/auth";
import type { AppSection } from "../api/auth";
import {
  getStoredAccessToken,
  getStoredUser,
  setStoredAccessToken,
  setStoredUser,
  type StoredUser,
} from "../api/client";

interface AuthContextValue {
  accessToken: string | null;
  user: StoredUser | null;
  isAuthenticated: boolean;
  /** True while the session is being re-read from `/auth/me` and grants aren't known yet. */
  isLoadingSession: boolean;
  canView: (section: AppSection) => boolean;
  canEdit: (section: AppSection) => boolean;
  login: (email: string, password: string) => Promise<authApi.AuthResponse>;
  claimInvite: (email: string, token: string, password: string) => Promise<authApi.AuthResponse>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Session state (token + profile + section grants) for the whole app.
 *
 * This was a plain `useAuth` hook holding per-component state, which was
 * fine while only AppShell and RequireAuth read it. Section grants changed
 * that: the nav, the route guards and every page's action buttons all read
 * the same matrix, and the owner can change it mid-session — with
 * per-component state, the copy each component happened to read at mount
 * would drift apart. That's the "replace with a context" case the old hook's
 * comment called out, so this is it. Mirrors LocaleProvider/ThemeProvider.
 *
 * Still no refresh-token flow (matches the backend's single-access-token
 * simplification — see backend CLAUDE.md).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(getStoredAccessToken);
  const [user, setUser] = useState<StoredUser | null>(getStoredUser);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  const applySession = useCallback((response: authApi.AuthResponse) => {
    const storedUser: StoredUser = {
      fullName: response.fullName,
      role: response.role,
      access: response.access,
    };
    setStoredAccessToken(response.accessToken);
    setStoredUser(storedUser);
    setAccessToken(response.accessToken);
    setUser(storedUser);
  }, []);

  const logout = useCallback(() => {
    setStoredAccessToken(null);
    setStoredUser(null);
    setAccessToken(null);
    setUser(null);
  }, []);

  /**
   * Grants aren't a JWT claim (the backend reads them per request so an edit
   * takes effect immediately), so the copy saved at login is only as fresh as
   * the login. Re-read them once per app load; a 401 here means the token
   * expired or the account was revoked, which is the one case worth clearing
   * the session for.
   */
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setIsLoadingSession(true);
    authApi
      .getCurrentUser()
      .then((current) => {
        if (cancelled) return;
        const storedUser: StoredUser = {
          fullName: current.fullName,
          role: current.role,
          access: current.access,
        };
        setStoredUser(storedUser);
        setUser(storedUser);
      })
      .catch((error) => {
        if (!cancelled && error instanceof Error && "status" in error && error.status === 401) {
          logout();
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login({ email, password });
      applySession(response);
      return response;
    },
    [applySession],
  );

  const claimInvite = useCallback(
    async (email: string, token: string, password: string) => {
      const response = await authApi.claimInvite({ email, token, password });
      applySession(response);
      return response;
    },
    [applySession],
  );

  // Unknown grants deny rather than allow: the tab appearing a moment late is
  // better than one appearing that the member can't actually open.
  const canView = useCallback((section: AppSection) => user?.access?.[section] !== "NONE" && !!user?.access, [user]);
  const canEdit = useCallback((section: AppSection) => user?.access?.[section] === "FULL", [user]);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        user,
        isAuthenticated: accessToken !== null,
        isLoadingSession,
        canView,
        canEdit,
        login,
        claimInvite,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
