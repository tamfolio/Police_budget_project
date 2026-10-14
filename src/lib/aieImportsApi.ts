import { apiFetch, API_BASE_URL } from "@/lib/apiClient";
import { getAccessToken } from "@/lib/authStorage";

export type AieImportStatus = "pending" | "approved" | "rejected";
export type AieImportAction = "append" | "correction" | "replace";

export interface AieImportSubmitter {
  id: string;
  fullName?: string | null;
  email?: string | null;
}

export interface AieImportSummary {
  importId: string;
  action: AieImportAction;
  fiscalYear: number;
  fileName: string;
  submittedBy: AieImportSubmitter;
  status: AieImportStatus;
  rowCounts: { budgets?: number; actuals?: number };
  overlapContext?: unknown;
  createdAt: string;
}

export interface AieImportReconciliationRow {
  month: string;
  budgetCode: string;
  incomingAmount: number;
  approvedAmount: number;
}

export interface AieImportDetail extends AieImportSummary {
  rows: AieImportReconciliationRow[];
}

export interface ImportConflict {
  conflict: true;
  overlaps: Array<{
    month: string;
    budgetCode: string;
    existingAmount: number;
    incomingAmount: number;
  }>;
}

function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["data", "items", "imports"]) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

async function importFetch<T>(
  path: string,
  form: FormData,
  allow409 = false,
): Promise<{ status: number; body: T }> {
  const token = getAccessToken();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { method: "POST", headers, body: form });
  const payload = await res.json().catch(() => null);

  if (!res.ok && !(allow409 && res.status === 409)) {
    const msg =
      payload?.error?.message ??
      payload?.message ??
      `Upload failed (${res.status})`;
    throw new Error(msg);
  }

  const body = (payload?.data ?? payload) as T;
  return { status: res.status, body };
}

export async function uploadAieWorkbook(
  file: File,
  fiscalYear: number,
  action: "append" | "correction",
): Promise<AieImportSummary> {
  const form = new FormData();
  form.append("file", file);
  form.append("fiscalYear", String(fiscalYear));
  form.append("action", action);
  const { body } = await importFetch<AieImportSummary>("/aies/imports", form);
  return body;
}

export async function replaceAieWorkbook(
  file: File,
  fiscalYear: number,
  confirmReplacement = false,
): Promise<AieImportSummary | ImportConflict> {
  const form = new FormData();
  form.append("file", file);
  form.append("fiscalYear", String(fiscalYear));
  form.append("confirmReplacement", String(confirmReplacement));
  const { status, body } = await importFetch<AieImportSummary | ImportConflict>(
    "/aies/imports/replace",
    form,
    true,
  );
  if (status === 409) return { ...(body as object), conflict: true } as ImportConflict;
  return body as AieImportSummary;
}

export async function getAieImport(importId: string): Promise<AieImportDetail> {
  return apiFetch<AieImportDetail>(`/aies/imports/${encodeURIComponent(importId)}`);
}

export async function listWorkbookReconciliations(): Promise<AieImportSummary[]> {
  const data = await apiFetch<unknown>("/budget-proposals/workbook-reconciliations");
  return asArray<AieImportSummary>(data);
}

export async function approveWorkbookReconciliation(importId: string): Promise<void> {
  await apiFetch(`/budget-proposals/workbook-reconciliations/${encodeURIComponent(importId)}/approve`, {
    method: "POST",
  });
}

export async function rejectWorkbookReconciliation(importId: string, reason: string): Promise<void> {
  await apiFetch(`/budget-proposals/workbook-reconciliations/${encodeURIComponent(importId)}/reject`, {
    method: "POST",
    body: { reason },
  });
}

export async function getBudgetCodeSummary(code: string, fiscalYear: number): Promise<unknown> {
  return apiFetch(`/aies/budget-codes/${encodeURIComponent(code)}/summary?fiscalYear=${fiscalYear}`);
}

export async function getBudgetCodeActuals(code: string, fiscalYear: number): Promise<unknown> {
  return apiFetch(`/aies/budget-codes/${encodeURIComponent(code)}/actuals?fiscalYear=${fiscalYear}`);
}
