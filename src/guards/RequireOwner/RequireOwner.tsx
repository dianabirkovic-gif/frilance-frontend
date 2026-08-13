import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

/**
 * The owner-only counterpart to `RequireSection`, for the one thing that
 * isn't a grantable section: team management. Covers what hiding the nav
 * item doesn't — a typed URL, a bookmark, or a link from before the member's
 * role changed. Sends them to Overview, which every member has.
 *
 * Cosmetic, like every other guard here: `GET /api/v1/team` and the
 * invite/access/revoke endpoints all reject a non-owner on their own, so
 * this only spares them a page that would render nothing but an error.
 * Waits for `isLoadingSession` so a mid-refresh load doesn't bounce the
 * owner off their own screen.
 */
export function RequireOwner({ children }: { children: ReactNode }) {
  const { canManageTeam, isLoadingSession, user } = useAuth();

  if (isLoadingSession && !user) {
    return null;
  }

  if (!canManageTeam) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
