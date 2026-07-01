const ACCESS_KEY = "pab.accessToken";
const REFRESH_KEY = "pab.refreshToken";
const USER_KEY = "pab.user";

export interface StoredRole {
  id: string;
  name: string;
  code: string;
  description: string | null;
  permissions?: Array<{ id: string; name: string; code: string }>;
}

export interface StoredUser {
  id: string;
  email: string;
  fullName: string;
  role: StoredRole;
}

export function getAccessToken(): string | null {
  try { return localStorage.getItem(ACCESS_KEY); } catch { return null; }
}

export function getRefreshToken(): string | null {
  try { return localStorage.getItem(REFRESH_KEY); } catch { return null; }
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch { return null; }
}

export function setSession(accessToken: string, refreshToken: string, user: StoredUser) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("pab:auth-changed"));
}

/** Update just the tokens (e.g. after a refresh). User payload is unchanged. */
export function updateTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  window.dispatchEvent(new CustomEvent("pab:auth-changed"));
}

/** Update just the user payload (e.g. after /auth/me). Tokens are unchanged. */
export function updateUser(user: StoredUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("pab:auth-changed"));
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent("pab:auth-changed"));
}