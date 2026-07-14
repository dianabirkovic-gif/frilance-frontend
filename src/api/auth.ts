import { apiRequest } from "./client";

export type Role = "OWNER" | "PROJECT_MANAGER" | "SMM" | "TARGETOLOGIST" | "FREELANCER";
export type WorkMode = "FREELANCER" | "AGENCY";

/** Mirrors backend Role — display label only, not an access decision (that's server-side, see backend CLAUDE.md). */
export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Власниця агентства",
  PROJECT_MANAGER: "Проджект-менеджер",
  SMM: "SMM-спеціаліст",
  TARGETOLOGIST: "Таргетолог",
  FREELANCER: "Фрілансер",
};

export interface AuthResponse {
  accessToken: string;
  fullName: string;
  role: Role;
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

/** FR-01 only — see backend CLAUDE.md for why FR-02 (agency role login) isn't here yet. */
export function login(request: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", { method: "POST", body: request, auth: false });
}

export function register(request: RegisterRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/register", { method: "POST", body: request, auth: false });
}
