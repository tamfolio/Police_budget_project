import { apiFetch } from "@/lib/apiClient";

export type AieStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED";

export const AIE_STATUSES: AieStatus[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
];

export const AIE_ITEM_CODES = [
  "TRAVEL",
  "OFFICE_SUPPLIES",
  "EQUIPMENT",
  "CONSULTANCY",
  "TRAINING",
  "MAINTENANCE",
  "UTILITIES",
  "OTHER",
] as const;
export type AieItemCode = (typeof AIE_ITEM_CODES)[number];

export const AIE_NO_PATTERN = /^[A-Z0-9]+\/\d{4}\//;

export interface AieLineItem {
  id?: string;
  aieId?: string;
  itemCodeId: string;
  subItemCodeId: string;
  subItemLabel?: string | null;
  budgetAmount: number;
  fulfillingProposal?: unknown;
  actualAmountId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAieLineItem {
  itemCodeId: string;
  subItemCodeId: string;
  budgetAmount: number;
}

export interface Aie {
  id: string;
  fiscalYear: number;
  aieNo: string;
  issueDate: string;
  expiresOn?: string | null;
  recipientUnit: string;
  lineItems: AieLineItem[];
  status: AieStatus;
  totalAmount?: number | string;
  createdById?: string | null;
  reviewedById?: string | null;
  approvedById?: string | null;
  reviewedAt?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAiePayload {
  fiscalYear: number;
  aieNo: string;
  issueDate: string;
  expiresOn?: string;
  recipientUnit: string;
  lineItems: CreateAieLineItem[];
}

export type UpdateAiePayload = Partial<Omit<CreateAiePayload, "lineItems">> & { lineItems?: CreateAieLineItem[] };

export interface ListAiesParams {
  fiscalYear?: number;
  status?: AieStatus;
  createdById?: string;
  expiringBefore?: string; // YYYY-MM-DD
}

function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Normalize the list response — handles bare arrays and all known wrapper shapes. */
function asAieArray(data: unknown): Aie[] {
  if (Array.isArray(data)) return data as Aie[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    // Try every key the API has been observed to use
    for (const key of ["aies", "items", "data", "records", "results", "list"]) {
      if (Array.isArray(obj[key])) return obj[key] as Aie[];
    }
    // One level of nesting: { data: { records: [...] } }
    if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
      const inner = obj.data as Record<string, unknown>;
      for (const key of ["aies", "items", "records", "results", "list"]) {
        if (Array.isArray(inner[key])) return inner[key] as Aie[];
      }
    }
  }
  return [];
}

export async function listAies(params: ListAiesParams = {}) {
  const raw = await apiFetch<unknown>(`/aies${qs(params as Record<string, string | number | undefined>)}`);
  return asAieArray(raw);
}

// ─── AIE Report ────────────────────────────────────────────────────────────

export interface AieReportRow {
  code: string;
  expenditureItem: string;
  annualAppropriation: number;
  percentAllocated: number;
  totalBudget: number;
  totalActual: number;
  balance: number;
  months: Record<string, { budget: number; actual: number }>;
}

export interface AieReportParams {
  fiscalYear?: number;
  month?: number;
}

export async function getAiesReport(params: AieReportParams = {}) {
  const data = await apiFetch<{ rows: AieReportRow[] }>(
    `/aies/report${qs(params as Record<string, string | number | undefined>)}`,
  );
  return data;
}

export async function getAie(id: string) {
  return apiFetch<Aie>(`/aies/${id}`);
}

export async function createAie(payload: CreateAiePayload) {
  return apiFetch<Aie>(`/aies`, { method: "POST", body: payload });
}

export async function updateAie(id: string, payload: UpdateAiePayload) {
  return apiFetch<Aie>(`/aies/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAie(id: string) {
  return apiFetch<unknown>(`/aies/${id}`, { method: "DELETE" });
}

export async function submitAie(id: string) {
  return apiFetch<Aie>(`/aies/${id}/submit`, { method: "POST" });
}

export async function reviewAie(id: string) {
  return apiFetch<Aie>(`/aies/${id}/review`, { method: "POST" });
}

export async function approveAie(id: string) {
  return apiFetch<Aie>(`/aies/${id}/approve`, { method: "POST" });
}

export async function rejectAie(id: string, reason: string) {
  return apiFetch<Aie>(`/aies/${id}/reject`, { method: "POST", body: { reason } });
}

export async function reopenAie(id: string) {
  return apiFetch<Aie>(`/aies/${id}/reopen`, { method: "PATCH" });
}

export async function getAieFyTotals(fiscalYear: number) {
  return apiFetch<{ fiscalYear: number; totalAmount: number; count: number }>(
    `/aies/totals/${fiscalYear}`,
  );
}

export async function getAieReviewQueue() {
  const data = await apiFetch<unknown>(`/aies/queue/review`);
  return asAieArray(data);
}

export async function getAieApprovalQueue() {
  const data = await apiFetch<unknown>(`/aies/queue/approval`);
  return asAieArray(data);
}