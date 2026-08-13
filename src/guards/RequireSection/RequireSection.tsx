import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { AppSection } from "../../api/auth";
import { useAuth } from "../../hooks/useAuth";

/**
 * Keeps a member out of a section the owner granted them NONE, for the case
 * hiding the nav item doesn't cover: typing the URL, a bookmark, or a link
 * from before their access changed. Sends them to the Overview screen, which
 * every member has, rather than to an error page.
 *
 * Cosmetic, like the nav filtering — the backend 403s these endpoints
 * regardless (see AccessService). Waits for `isLoadingSession` so a
 * mid-refresh page load doesn't bounce someone who does have access.
 */
export function RequireSection({ section, children }: { section: AppSection; children: ReactNode }) {
  const { canView, isLoadingSession, user } = useAuth();

  if (isLoadingSession && !user) {
    return null;
  }

  if (!canView(section)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
