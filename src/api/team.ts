import type { AccessMatrix, Role } from "./auth";
import { apiRequest } from "./client";

export type TeamMemberStatus = "ACTIVE" | "INVITED";

/** Mirrors TeamMemberResponse on the backend exactly — keep in sync. */
export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  status: TeamMemberStatus;
  loadPercent: number;
  clientCount: number;
  access: AccessMatrix;
}

/**
 * Mirrors InviteTeamMemberRequest on the backend exactly — keep in sync. No
 * password field: the invitee sets their own via `claimInvite` in
 * `api/auth.ts`. `role` must be PROJECT_MANAGER, SMM or TARGETOLOGIST — see
 * TeamService#invite.
 *
 * `access` is what this member will actually be allowed to do, chosen by the
 * owner rather than implied by the role. Every section must be present — the
 * backend 400s a partial matrix instead of defaulting the gaps to NONE.
 */
export interface InviteTeamMemberPayload {
  fullName: string;
  email: string;
  role: Role;
  access: AccessMatrix;
}

/**
 * Mirrors InviteTeamMemberResponse on the backend exactly — keep in sync.
 * `inviteToken` is shown to the owner exactly once, here — it's never
 * returned again by any other endpoint (not even `getTeam`), since only its
 * bcrypt hash is persisted. The owner must relay it to the invitee
 * out-of-band right away.
 */
export interface InviteTeamMemberResult {
  member: TeamMember;
  inviteToken: string;
}

export function getTeam(): Promise<TeamMember[]> {
  return apiRequest<TeamMember[]>("/team");
}

export function inviteTeamMember(payload: InviteTeamMemberPayload): Promise<InviteTeamMemberResult> {
  return apiRequest<InviteTeamMemberResult>("/team/invite", { method: "POST", body: payload });
}

/**
 * Owner-only: replaces a member's whole section matrix. Takes effect on
 * their next request — the backend reads grants per request rather than from
 * their token, so a revoked section closes without waiting for them to log
 * in again.
 */
export function updateTeamMemberAccess(id: string, access: AccessMatrix): Promise<TeamMember> {
  return apiRequest<TeamMember>(`/team/${id}/access`, { method: "PATCH", body: { access } });
}

/** Owner-only: deletes a team member's account outright — the way to undo a bad or hijacked invite. */
export function revokeTeamMember(id: string): Promise<void> {
  return apiRequest<void>(`/team/${id}`, { method: "DELETE" });
}
