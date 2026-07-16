import { apiRequest } from "./client";

export type Role = "OWNER" | "PROJECT_MANAGER" | "SMM" | "TARGETOLOGIST" | "FREELANCER";
export type WorkMode = "FREELANCER" | "AGENCY";

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
