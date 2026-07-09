import { clearSession, getAccessToken, getRefreshToken, updateTokens, updateUser } from "@/lib/authStorage";
import type { StoredUser } from "@/lib/authStorage";

// The upstream API now sends proper CORS headers, so we call it directly.
// Flip USE_PROXY back to true to route through the pab-proxy edge function
// if CORS ever regresses.
const USE_PROXY = false;
const DIRECT_BASE = "https://api.pabdigitalsystem.com";
const PROXY_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pab-proxy`;
export const API_BASE_URL = USE_PROXY ? PROXY_BASE : DIRECT_BASE;

export interface ApiErrorShape {
  code: string;
  message: string;
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

interface ApiSuccess<T> { success: true; data: T }
interface ApiFailure { success: false; error: ApiErrorShape }
type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Skip attaching the Authorization header (e.g. for /auth/login). */
  skipAuth?: boolean;
}

/** Single-flight refresh promise so concurrent 401s only trigger one /auth/refresh. */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { success: true; data: { accessToken: string; refreshToken: string } }
        | { success: false; error: ApiErrorShape }
        | null;
      if (!res.ok || !payload || payload.success === false) {
        clearSession();
        return null;
      }
      updateTokens(payload.data.accessToken, payload.data.refreshToken);
      return payload.data.accessToken;
    } catch {
      clearSession();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function apiFetch<T = unknown>(path: string, opts: ApiFetchOptions = {}, _retried = false): Promise<T> {
  const { body, skipAuth, headers, ...rest } = opts;
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(headers as Record<string, string> | undefined),
  };
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let payload: ApiEnvelope<T> | null = null;
  try { payload = (await res.json()) as ApiEnvelope<T>; } catch { /* non-JSON */ }

  // On 401, try a one-shot refresh and retry the original request before giving up.
  if (res.status === 401 && !skipAuth && !_retried && path !== "/auth/refresh") {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch<T>(path, opts, true);
    }
    clearSession();
  }

  if (!res.ok || !payload || payload.success === false) {
    const err = (payload && payload.success === false ? payload.error : null) ?? {
      code: `HTTP_${res.status}`,
      message: res.statusText || "Request failed",
    };
    throw new ApiError(err.message, err.code, res.status);
  }

  // Some endpoints return a bare response (array or plain object) with no { success, data } envelope.
  if ((payload as Record<string, unknown>).success !== true) return payload as unknown as T;

  return payload.data;
}

/** Fetch current user profile from /auth/me. Returns null if unauthenticated or call fails. */
export async function fetchCurrentUser(): Promise<StoredUser | null> {
  try {
    const user = await apiFetch<StoredUser>("/auth/me", { method: "GET" });
    updateUser(user);
    return user;
  } catch {
    return null;
  }
}