import { apiFetch } from "@/lib/apiClient";

/** Lifecycle of a budget proposal on the upstream API. */
export type BudgetProposalStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PENDING_REVIEW"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED";

export const PROPOSAL_STATUSES: BudgetProposalStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "PENDING_REVIEW",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
];

export interface BudgetProposal {
  id: string;
  fiscalYear: number;
  departmentId: string;
  subItemId: string;
  amount: number;
  status: BudgetProposalStatus;
  description?: string | null;
  notes?: string | null;
  supportingDocuments?: string[] | null;
  createdById: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateBudgetProposalPayload {
  fiscalYear: number;
  departmentId: string;
  subItemId: string;
  amount: number;
  description?: string;
  notes?: string;
  supportingDocuments?: string[];
}

export type UpdateBudgetProposalPayload = Partial<CreateBudgetProposalPayload>;

export interface ListBudgetProposalsParams {
  fiscalYear?: number;
  departmentId?: string;
  subItemId?: string;
  status?: BudgetProposalStatus;
  createdById?: string;
  page?: number;
  limit?: number;
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
    for (const key of ["data", "items", "proposals"]) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

export async function listBudgetProposals(params: ListBudgetProposalsParams = {}) {
  const data = await apiFetch<unknown>(
    `/budget-proposals${qs(params as Record<string, string | number | undefined>)}`,
  );
  return asArray<BudgetProposal>(data);
}

export async function getBudgetProposal(id: string) {
  return apiFetch<BudgetProposal>(`/budget-proposals/${encodeURIComponent(id)}`);
}

export async function createBudgetProposal(payload: CreateBudgetProposalPayload) {
  return apiFetch<BudgetProposal>(`/budget-proposals`, { method: "POST", body: payload });
}

export async function updateBudgetProposal(id: string, payload: UpdateBudgetProposalPayload) {
  return apiFetch<BudgetProposal>(`/budget-proposals/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteBudgetProposal(id: string) {
  return apiFetch<unknown>(`/budget-proposals/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function submitBudgetProposal(id: string) {
  return apiFetch<BudgetProposal>(`/budget-proposals/${encodeURIComponent(id)}/submit`, { method: "POST" });
}

export async function reviewBudgetProposal(id: string, comment?: string) {
  return apiFetch<BudgetProposal>(`/budget-proposals/${encodeURIComponent(id)}/review`, {
    method: "POST",
    body: comment ? { comment } : undefined,
  });
}

export async function approveBudgetProposal(id: string) {
  return apiFetch<BudgetProposal>(`/budget-proposals/${encodeURIComponent(id)}/approve`, { method: "POST" });
}

export async function rejectBudgetProposal(id: string, reason: string) {
  return apiFetch<BudgetProposal>(`/budget-proposals/${encodeURIComponent(id)}/reject`, {
    method: "POST",
    body: { reason },
  });
}