import { apiRequest } from "./client";

export type Role = "OWNER" | "PROJECT_MANAGER" | "SMM" | "TARGETOLOGIST" | "FREELANCER";
export type WorkMode = "FREELANCER" | "AGENCY";

/** Mirrors AppSection on the backend exactly — keep in sync. */
export type AppSection = "CLIENTS" | "CONTENT" | "TARGET" | "FINANCE" | "ANALYTICS";

/** Mirrors AccessLevel on the backend exactly — keep in sync. */
export type AccessLevel = "NONE" | "READ" | "FULL";

/**
 * What the agency owner granted this member per section (see backend
 * MemberAccess). Always complete — the backend rejects a partial matrix — so
 * a lookup never needs a fallback.
 *
 * The UI uses it to hide a section the member can't open and to drop
 * create/update controls in a READ one. It is never the enforcement point:
 * the backend re-checks every guarded call, so a stale copy costs a 403, not
 * unauthorized access.
 */
export type AccessMatrix = Record<AppSection, AccessLevel>;

export const APP_SECTIONS: AppSection[] = ["CLIENTS", "CONTENT", "TARGET", "FINANCE", "ANALYTICS"];
export const ACCESS_LEVELS: AccessLevel[] = ["NONE", "READ", "FULL"];

export interface AuthResponse {
  accessToken: string;
  fullName: string;
  role: Role;
  access: AccessMatrix;
}

/** Mirrors CurrentUserResponse on the backend exactly — keep in sync. */
export interface CurrentUser {
  fullName: string;
  role: Role;
  access: AccessMatrix;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  workMode: WorkMode;
}

/**
 * Mirrors ClaimInviteRequest on the backend exactly — keep in sync. `token`
 * is the one-time secret from `InviteTeamMemberResult.inviteToken` (see
 * api/team.ts), relayed by the owner out-of-band. The email alone is not a
 * secret — `GET /api/v1/team` shows every pending invitee's email to the
 * whole tenant — so the backend rejects a claim without the matching token.
 */
export interface ClaimInviteRequest {
  email: string;
  token: string;
  password: string;
}

/** FR-01 only — see backend CLAUDE.md for why FR-02 (agency role login) isn't here yet. */
export function login(request: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", { method: "POST", body: request, auth: false });
}

export function register(request: RegisterRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/register", { method: "POST", body: request, auth: false });
}

/** Activates a team member invited via `api/team.ts`'s `inviteTeamMember` — see TeamService#invite on the backend. */
export function claimInvite(request: ClaimInviteRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/claim-invite", { method: "POST", body: request, auth: false });
}

/**
 * Re-reads the caller's own profile and, the reason this exists, their
 * current `access` — the owner can change it mid-session and it isn't a JWT
 * claim, so the copy stored at login goes stale. `useAuth` refreshes through
 * this on mount rather than making the user log in again to see a section
 * they were just granted.
 */
export function getCurrentUser(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/auth/me");
}
