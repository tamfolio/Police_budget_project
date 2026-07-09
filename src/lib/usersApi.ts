import { apiFetch } from "@/lib/apiClient";
import type { ApiRoleDetail } from "@/lib/rolesApi";

export interface InviteUserInput {
  email: string;
  fullName: string;
  roleId: string;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  role: ApiRoleDetail;
  invitedBy: string;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListAdminUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** GET /admin/users — list all users. */
export async function listAdminUsers(params: ListAdminUsersParams = {}) {
  const data = await apiFetch<AdminUser[] | { users?: AdminUser[]; data?: AdminUser[] }>(
    `/admin/users${qs(params as Record<string, string | number | undefined>)}`,
  );
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.users)) return obj.users as AdminUser[];
    if (Array.isArray(obj.data)) return obj.data as AdminUser[];
  }
  return [] as AdminUser[];
}

/** GET /admin/users/:id — get a single user. */
export async function getAdminUser(id: string) {
  return apiFetch<AdminUser>(`/admin/users/${encodeURIComponent(id)}`);
}

/** POST /auth/invite — invite a single user. */
export async function inviteUsers(invite: InviteUserInput) {
  return apiFetch<AdminUser>(`/auth/invite`, {
    method: "POST",
    body: invite,
  });
}

/** POST /admin/users/:id/deactivate — deactivate a user. */
export async function deactivateUser(id: string) {
  return apiFetch<AdminUser>(`/admin/users/${encodeURIComponent(id)}/deactivate`, {
    method: "POST",
  });
}
