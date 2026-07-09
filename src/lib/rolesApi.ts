import { apiFetch } from "@/lib/apiClient";

export interface ApiPermission {
  id: string;
  name: string;
  code: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiRoleSummary {
  id: string;
  name: string;
  code: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiRoleDetail extends ApiRoleSummary {
  permissions: ApiPermission[];
}

export interface Pagination {
  total: number;
  perPage: number;
  totalPages: number;
  page: number;
}

export interface RolesListResponse {
  roles: ApiRoleSummary[];
  pagination: Pagination;
}

export interface RoleWritePayload {
  name: string;
  description?: string;
  permissions: string[]; // permission IDs
}

export async function listRoles(params: { pageNumber?: number; pageSize?: number; search?: string } = {}) {
  const qs = new URLSearchParams();
  qs.set("pageNumber", String(params.pageNumber ?? 1));
  qs.set("pageSize", String(params.pageSize ?? 20));
  if (params.search) qs.set("search", params.search);
  return apiFetch<RolesListResponse>(`/roles?${qs.toString()}`);
}

export async function getRole(id: string) {
  return apiFetch<ApiRoleDetail>(`/roles/${id}`);
}

export async function createRole(payload: RoleWritePayload) {
  return apiFetch<ApiRoleDetail>(`/roles`, { method: "POST", body: payload });
}

export async function updateRole(id: string, payload: RoleWritePayload) {
  return apiFetch<ApiRoleDetail>(`/roles/${id}`, { method: "PATCH", body: payload });
}

export async function deleteRole(id: string) {
  return apiFetch<unknown>(`/roles/${id}`, { method: "DELETE" });
}

/** Best-effort permissions list. The /permissions endpoint follows the same
 *  pagination shape as /roles. Returns an empty array if the endpoint is
 *  unavailable so the UI can still render. */
export async function listPermissions(params: { pageNumber?: number; pageSize?: number; search?: string } = {}) {
  const qs = new URLSearchParams();
  qs.set("pageNumber", String(params.pageNumber ?? 1));
  qs.set("pageSize", String(params.pageSize ?? 200));
  if (params.search) qs.set("search", params.search);
  try {
    return await apiFetch<{ permissions: ApiPermission[]; pagination: Pagination }>(
      `/permissions?${qs.toString()}`,
    );
  } catch {
    return { permissions: [], pagination: { total: 0, perPage: 0, totalPages: 0, page: 1 } };
  }
}

export interface CreatePermissionPayload {
  /** Machine code, e.g. "roles.index". 2–255 chars. */
  code: string;
  /** Human-readable name. */
  name: string;
}

export async function createPermission(payload: CreatePermissionPayload) {
  return apiFetch<ApiPermission>(`/admin/permissions`, { method: "POST", body: payload });
}