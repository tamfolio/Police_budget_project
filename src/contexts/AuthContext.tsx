import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { apiFetch, ApiError, fetchCurrentUser } from "@/lib/apiClient";
import { clearSession, getAccessToken, getStoredUser, setSession, StoredUser } from "@/lib/authStorage";

export type AppRole =
  | "SYSADMIN"
  | "BUDGET_DIR"
  | "BUDGET_OFF"
  | "BUDGET_CLK"
  | "AUDITOR"
  | "REPORT_VIEWER";

/** Shape exposed to the rest of the app via `useAuth().user`.
 *  Keeps `id` and `email` so existing components (which only read those two)
 *  continue to work unchanged. `fullName` and `role` are added on top. */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: StoredUser["role"];
  /** Back-compat shim for code that read user_metadata.full_name. */
  user_metadata?: { full_name?: string };
}

interface AuthCtx {
  user: AuthUser | null;
  /** Kept for back-compat — always null now (no Supabase session). */
  session: null;
  roles: AppRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  hasRole: (r: AppRole) => boolean;
  refreshRoles: () => Promise<void>;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
}

const Ctx = createContext<AuthCtx | null>(null);

function toAuthUser(u: StoredUser): AuthUser {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    user_metadata: { full_name: u.fullName },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate on mount: validate token via /auth/me and load fresh user data.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = getAccessToken();
      if (token) {
        const fresh = await fetchCurrentUser();
        if (!cancelled) {
          setUser(fresh ? toAuthUser(fresh) : null);
        }
      }
      if (!cancelled) setLoading(false);
    })();

    const onChange = () => {
      const s = getStoredUser();
      const t = getAccessToken();
      setUser(s && t ? toAuthUser(s) : null);
    };
    window.addEventListener("pab:auth-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("pab:auth-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const data = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        skipAuth: true,
        body: { email, password },
      });
      setSession(data.accessToken, data.refreshToken, data.user);
      setUser(toAuthUser(data.user));
      return { error: null };
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Unable to sign in. Please try again.";
      return { error: msg };
    }
  }, []);

  const signUp = useCallback(async (_email: string, _password: string, _fullName: string) => {
    return { error: "Account creation is handled by your System Administrator." };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      /* Ignore API errors — always clear local session. */
    }
    clearSession();
    setUser(null);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    try {
      await apiFetch<StoredUser>("/auth/update-password", { method: "POST", body: { password } });
      return { error: null };
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Unable to update password. Please try again.";
      return { error: msg };
    }
  }, []);

  const roles: AppRole[] = user?.role?.code ? [user.role.code as AppRole] : [];
  const hasRole = (r: AppRole) => roles.includes(r);
  const refreshRoles = async () => { /* roles are embedded in the login response; refresh on next sign-in */ };

  return (
    <Ctx.Provider value={{ user, session: null, roles, loading, signIn, signUp, signOut, updatePassword, hasRole, refreshRoles }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}