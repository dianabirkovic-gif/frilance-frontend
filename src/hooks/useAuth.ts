import { useContext } from "react";
import { AuthContext } from "./AuthProvider";

/**
 * Session, profile and section grants — see `AuthProvider` for why this is a
 * context now rather than the per-component state it used to be. Mirrors
 * `useLocale`/`useTheme`: throws outside its provider.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
