import { apiFetch } from "@/lib/apiClient";

export interface Department {
  id: string;
  name: string;
  isActive: boolean;
}

export interface CreateDepartmentPayload {
  name: string;
}

export type UpdateDepartmentPayload = Partial<CreateDepartmentPayload>;

export interface ListDepartmentsParams {
  isActive?: boolean;
}

function qs(params: Record<string, string | boolean | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function listDepartments(params: ListDepartmentsParams = {}) {
  return apiFetch<Department[]>(`/departments${qs(params as Record<string, string | boolean | undefined>)}`);
}

export async function getDepartment(id: string) {
  return apiFetch<Department>(`/departments/${id}`);
}

export async function createDepartment(payload: CreateDepartmentPayload) {
  return apiFetch<Department>("/departments", { method: "POST", body: payload });
}

export async function updateDepartment(id: string, payload: UpdateDepartmentPayload) {
  return apiFetch<Department>(`/departments/${id}`, { method: "PATCH", body: payload });
}

export async function deactivateDepartment(id: string) {
  return apiFetch<Department>(`/departments/${id}/deactivate`, { method: "PATCH" });
}
