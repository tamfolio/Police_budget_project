import { apiFetch } from "@/lib/apiClient";

/** Mirrors TransactionStatus enum on the upstream API. */
export type TransactionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "OFFICER_REVIEWED"
  | "APPROVED"
  | "RETURNED"
  | "CANCELLED";

export const TRANSACTION_STATUSES: TransactionStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "OFFICER_REVIEWED",
  "APPROVED",
  "RETURNED",
  "CANCELLED",
];

export interface BudgetSubItemLite {
  code?: string;
  name?: string;
  [k: string]: unknown;
}

export interface ExpenditureRecord {
  id: string;
  fiscalYear: number;
  expenseDate: string; // YYYY-MM-DD
  voucherNo: string;
  payee: string;
  subItemCode: string;
  aieId?: string | null;
  grossAmount: number;
  whtAmount: number;
  netAmount: number;
  description?: string | null;
  status: TransactionStatus;
  createdBy: string;
  submittedBy?: string | null;
  reviewedBy?: string | null;
  approvedBy?: string | null;
  returnRemarks?: string | null;
  subItem?: BudgetSubItemLite;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateExpenditurePayload {
  fiscalYear: number;
  expenseDate: string;
  voucherNo: string;
  payee: string;
  subItemCode: string;
  aieId?: string | null;
  grossAmount: number;
  whtAmount?: number;
  description?: string;
}

export type UpdateExpenditurePayload = Partial<CreateExpenditurePayload>;

export interface ExpenditureRollupItem {
  code: string;
  name: string;
  grossAmount: number;
  whtAmount: number;
  netAmount: number;
}

export interface ListExpendituresParams {
  status?: TransactionStatus;
  fiscalYear?: number;
}

export interface ExpenditureAuditEntry {
  action: string;
  actor?: string | null;
  actorName?: string | null;
  remarks?: string | null;
  createdAt: string;
  [key: string]: unknown;
}

function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["items", "data", "expenditures", "rollup"]) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

export async function listExpenditures(params: ListExpendituresParams = {}) {
  const data = await apiFetch<unknown>(`/expenditures${qs(params as Record<string, string | number | undefined>)}`);
  return asArray<ExpenditureRecord>(data);
}

export async function getExpenditure(id: string) {
  return apiFetch<ExpenditureRecord>(`/expenditures/${encodeURIComponent(id)}`);
}

export async function createExpenditure(payload: CreateExpenditurePayload) {
  return apiFetch<ExpenditureRecord>(`/expenditures`, { method: "POST", body: payload });
}

export async function updateExpenditure(id: string, payload: UpdateExpenditurePayload) {
  return apiFetch<ExpenditureRecord>(`/expenditures/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteExpenditure(id: string) {
  return apiFetch<unknown>(`/expenditures/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function submitExpenditure(id: string) {
  return apiFetch<ExpenditureRecord>(`/expenditures/${encodeURIComponent(id)}/submit`, { method: "POST" });
}

export async function reviewExpenditure(id: string) {
  return apiFetch<ExpenditureRecord>(`/expenditures/${encodeURIComponent(id)}/review`, { method: "POST" });
}

export async function approveExpenditure(id: string) {
  return apiFetch<ExpenditureRecord>(`/expenditures/${encodeURIComponent(id)}/approve`, { method: "POST" });
}

export async function returnExpenditure(id: string, remarks: string) {
  return apiFetch<ExpenditureRecord>(`/expenditures/${encodeURIComponent(id)}/return`, {
    method: "POST",
    body: { remarks },
  });
}

export async function getExpenditureAuditTrail(id: string) {
  const data = await apiFetch<ExpenditureAuditEntry[] | { entries?: ExpenditureAuditEntry[] }>(
    `/expenditures/${encodeURIComponent(id)}/audit-trail`,
  );
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as { entries?: ExpenditureAuditEntry[] }).entries)) {
    return (data as { entries: ExpenditureAuditEntry[] }).entries;
  }
  return [];
}

export async function getExpenditureRollup(fiscalYear?: number) {
  const data = await apiFetch<unknown>(`/expenditures/rollup${qs({ fiscalYear })}`);
  return asArray<ExpenditureRollupItem>(data);
}