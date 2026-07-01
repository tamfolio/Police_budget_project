import { apiFetch } from "@/lib/apiClient";

export type FundInflowStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED";

export type FundInflowSource =
  | "FAAC_ALLOCATION"
  | "SPECIAL_INTERVENTION_FUND"
  | "OTHERS";

export const FUND_INFLOW_SOURCES: FundInflowSource[] = [
  "FAAC_ALLOCATION",
  "SPECIAL_INTERVENTION_FUND",
  "OTHERS",
];

export const FUND_INFLOW_STATUSES: FundInflowStatus[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
];

export const FUND_INFLOW_REFERENCE_PATTERN = /^[A-Z0-9/\-]+$/;

export interface FundInflow {
  id: string;
  fiscalYear: number;
  inflowDate: string;
  source: FundInflowSource;
  referenceNo?: string | null;
  amount: number | string;
  supportingDocuments?: string[] | null;
  notes?: string | null;
  status: FundInflowStatus;
  createdById?: string | null;
  reviewedById?: string | null;
  approvedById?: string | null;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
}

export interface CreateFundInflowPayload {
  fiscalYear: number;
  inflowDate: string; // YYYY-MM-DD
  source: FundInflowSource;
  referenceNo?: string;
  amount: number;
  supportingDocuments?: string[];
  notes?: string;
}

export type UpdateFundInflowPayload = Partial<CreateFundInflowPayload>;

export interface ListFundInflowsParams {
  fiscalYear?: number;
  source?: FundInflowSource;
  status?: FundInflowStatus;
  createdById?: string;
}

/** Build a query string from defined params only. */
function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/**
 * The list endpoint isn't documented with a precise schema, so we accept the
 * two shapes the rest of this API uses: either `{ inflows: [...] }` or a bare
 * array, and normalize to `FundInflow[]`.
 */
export async function listFundInflows(params: ListFundInflowsParams = {}) {
  const data = await apiFetch<unknown>(`/fund-inflows${qs(params as Record<string, string | number | undefined>)}`);
  if (Array.isArray(data)) return data as FundInflow[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.inflows)) return obj.inflows as FundInflow[];
    if (Array.isArray(obj.items)) return obj.items as FundInflow[];
    if (Array.isArray(obj.data)) return obj.data as FundInflow[];
  }
  return [] as FundInflow[];
}

export async function getFundInflow(id: string) {
  return apiFetch<FundInflow>(`/fund-inflows/${id}`);
}

export async function createFundInflow(payload: CreateFundInflowPayload) {
  return apiFetch<FundInflow>(`/fund-inflows`, { method: "POST", body: payload });
}

export async function updateFundInflow(id: string, payload: UpdateFundInflowPayload) {
  return apiFetch<FundInflow>(`/fund-inflows/${id}`, { method: "PATCH", body: payload });
}

export async function deleteFundInflow(id: string) {
  return apiFetch<unknown>(`/fund-inflows/${id}`, { method: "DELETE" });
}

export async function submitFundInflow(id: string) {
  return apiFetch<FundInflow>(`/fund-inflows/${id}/submit`, { method: "PATCH" });
}

export async function reviewFundInflow(id: string) {
  return apiFetch<FundInflow>(`/fund-inflows/${id}/review`, { method: "PATCH" });
}

export async function approveFundInflow(id: string) {
  return apiFetch<FundInflow>(`/fund-inflows/${id}/approve`, { method: "PATCH" });
}

export async function rejectFundInflow(id: string, reason: string) {
  return apiFetch<FundInflow>(`/fund-inflows/${id}/reject`, { method: "PATCH", body: { reason } });
}

export async function reopenFundInflow(id: string) {
  return apiFetch<FundInflow>(`/fund-inflows/${id}/reopen`, { method: "PATCH" });
}

export async function getFiscalYearTotals(fiscalYear: number) {
  return apiFetch<{ fiscalYear: number; totalAmount: number; count: number }>(
    `/fund-inflows/totals/${fiscalYear}`,
  );
}

export async function getReviewQueue() {
  const data = await apiFetch<unknown>(`/fund-inflows/queue/review`);
  if (Array.isArray(data)) return data as FundInflow[];
  return [] as FundInflow[];
}

export async function getApprovalQueue() {
  const data = await apiFetch<unknown>(`/fund-inflows/queue/approval`);
  if (Array.isArray(data)) return data as FundInflow[];
  return [] as FundInflow[];
}