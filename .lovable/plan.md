# Replace Supabase Auth with External API

## Goal
Switch sign-in from Lovable Cloud (Supabase) to `https://api.pabdigitalsystem.com`, starting with `POST /auth/login`. Preserve the existing `useAuth()` contract so no page/component changes are needed.

## What changes

### 1. New API client (`src/lib/apiClient.ts`)
- Central `apiFetch(path, options)` wrapper around `fetch`.
- Base URL: `https://api.pabdigitalsystem.com`.
- Automatically attaches `Authorization: Bearer <accessToken>` (read from localStorage) on every call.
- Normalizes the `{ success, data | error }` envelope and throws a typed error on `success: false`.
- All future endpoints (budget, etc.) will go through this.

### 2. Token + user storage (`src/lib/authStorage.ts`)
- localStorage keys: `pab.accessToken`, `pab.refreshToken`, `pab.user`.
- Helpers: `getAccessToken()`, `setSession(...)`, `clearSession()`, `getStoredUser()`.
- No refresh endpoint exists yet, so on 401 we simply clear the session and redirect to `/auth`.

### 3. Rewrite `src/contexts/AuthContext.tsx`
- Drop all `supabase.auth.*` calls.
- `signIn(email, password)` → POST `/auth/login`, store tokens + user, populate context.
- `signOut()` → clear localStorage, reset state.
- `signUp` is kept in the type for compatibility but disabled (returns "Account creation is handled by your administrator") since the spec hasn't been shared yet. The Sign Up tab on `AuthPage` will be hidden.
- `roles` is derived from `user.role.code` (e.g. `SYSADMIN`) so existing `hasRole("SYSADMIN")` checks continue to work.
- `user` shape exposed to the rest of the app: `{ id, email, fullName, role }`.

### 4. Role typing (`src/lib/roles.ts`, `src/contexts/AuthContext.tsx`)
- `AppRole` is currently typed from `Database["public"]["Enums"]["app_role"]`. I'll re-declare it locally as a string-literal union of the codes you already use (`SYSADMIN | BUDGET_DIR | BUDGET_OFF | BUDGET_CLK | AUDITOR | REPORT_VIEWER`) so we stop depending on the Supabase types file.
- `ROLE_LABEL` keeps the same keys/labels, so the sidebar and admin pages render unchanged.

### 5. `ProtectedRoute` + 401 handling
- `ProtectedRoute` keeps working — it just reads `user`/`roles` from context.
- When `apiFetch` gets a 401, it calls `clearSession()` and the next render kicks the user to `/auth`.

### 6. `AuthPage.tsx`
- Sign In tab: unchanged UX, now calls the new context `signIn`.
- First-time Setup tab: hidden for now (we'll re-enable when you send the signup endpoint).

## What stays untouched (for now)
- All other pages that import `supabase` for **data** (AIE records, budget, etc.) keep working against Lovable Cloud. We'll migrate those module-by-module as you send each endpoint.
- The Supabase client file itself stays (still used by data pages).

## Out of scope this turn
- Refresh-token flow (no endpoint).
- Signup / forgot-password (no endpoints shared yet).
- Migrating data endpoints — that comes when you paste the budget endpoints.

## Verification
- Type-check passes (build runs automatically).
- Manual: sign in with the sample creds → land on `/dashboard`, sidebar shows `System Administrator`, refresh keeps you signed in, Sign Out clears the session.
