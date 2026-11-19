import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

/**
 * Counterpart of `RequireOwner` for «Моя зп»: payouts are addressed to team
 * members, so an OWNER or FREELANCER (their own tenant, nobody pays them
 * through the register) has nothing to see there. The nav hides the item
 * (`memberOnly`); this covers a typed URL or bookmark. Cosmetic — the endpoint
 * takes the member from the token and is harmless for anyone else.
 */
export function RequireTeamMember({ children }: { children: ReactNode }) {
  const { ownsTenant, isLoadingSession, user } = useAuth();

  if (isLoadingSession && !user) {
    return null;
  }

  if (ownsTenant) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
