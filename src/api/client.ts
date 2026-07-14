import type { Role } from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const TOKEN_STORAGE_KEY = "frilanceos.accessToken";
const USER_STORAGE_KEY = "frilanceos.user";

export interface StoredUser {
  fullName: string;
  role: Role;
}

export function getStoredAccessToken(): string | null {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredAccessToken(token: string | null): void {
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function getStoredUser(): StoredUser | null {
  const raw = window.localStorage.getItem(USER_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as StoredUser) : null;
}

export function setStoredUser(user: StoredUser | null): void {
  if (user) {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

/**
 * Thin fetch wrapper: injects the bearer token, parses JSON, and turns a
 * non-2xx response into an `ApiError` that TanStack Query surfaces as
 * `error`. Every API module (auth.ts, dashboard.ts, ...) should go through
 * this rather than calling `fetch` directly — see frontend CLAUDE.md
 * "Data fetching conventions".
 */
export async function apiRequest<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (auth) {
    const token = getStoredAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new ApiError(response.status, errorBody?.message ?? response.statusText);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}
