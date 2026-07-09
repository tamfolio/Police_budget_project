import { apiFetch } from "@/lib/apiClient";

export type FiscalYearStatus = "OPEN" | "CLOSED";

export interface BudgetSubItem {
  code: string;
  categoryCode: string;
  name: string;
  sort: number;
  category?: {
    code: string;
    name: string;
    sort: number;
  };
}

export interface BudgetCategory {
  code: string;
  name: string;
  sort: number;
  subItems?: BudgetSubItem[];
}

export interface FiscalYear {
  year: number;
  status: FiscalYearStatus;
  appropriationActAmount: number;
  revisedAmount: number;
}

export interface BudgetCodeReferenceData {
  categories: BudgetCategory[];
  fiscalYears: FiscalYear[];
}

export interface CreateBudgetCodePayload {
  code: string;
  name: string;
  categoryCode?: string;
  sort?: number;
}

function qs(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") sp.set(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function createBudgetCode(payload: CreateBudgetCodePayload) {
  return apiFetch<BudgetCategory | BudgetSubItem>("/budget-codes", {
    method: "POST",
    body: payload,
  });
}

export async function listBudgetCodes(search?: string) {
  return apiFetch<BudgetCategory[]>(`/budget-codes${qs({ search })}`);
}

export async function getBudgetCodeReference(search?: string) {
  return apiFetch<BudgetCodeReferenceData>(`/budget-codes/reference-data${qs({ search })}`);
}

export async function seedBudgetCodes() {
  return apiFetch<{ categories: BudgetCategory[]; subItems: BudgetSubItem[] }>(
    "/budget-codes/seed-all",
    { method: "POST" },
  );
}

export async function updateFiscalYearStatus(year: number, status: FiscalYearStatus) {
  return apiFetch<FiscalYear>(`/budget-codes/fiscal-years/${year}/status`, {
    method: "PATCH",
    body: { status },
  });
}
