import { apiFetch } from "@/lib/apiClient";

export interface ZoneComparisonSide {
  zoneId: string;
  zoneName: string;
  totalAmount: number;
  itemCount: number;
}

export interface ZoneComparison {
  periodId: string;
  periodLabel: string;
  zoneA: ZoneComparisonSide;
  zoneB: ZoneComparisonSide;
}

export interface MonthPeriod {
  label: string;
  fiscalYear: number;
  month: number;
  totalAmount: number;
  count: number;
}

export interface MonthOverMonthComparison {
  current: MonthPeriod;
  previous: MonthPeriod;
  change: number;
  percentageChange: number | null;
}

export interface BudgetActualSide {
  totalAmount: number;
  count: number;
}

export interface BudgetVsActualComparison {
  fiscalYear: number;
  budget: BudgetActualSide;
  actual: BudgetActualSide;
  variance: number;
  variancePercentage: number | null;
  utilizationRate: number | null;
}

export interface ZoneComparisonParams {
  periodId: string;
  zoneAId: string;
  zoneBId: string;
}

export interface MonthOverMonthParams {
  fiscalYear?: number;
  month?: number;
}

export interface BudgetVsActualParams {
  fiscalYear: number;
  periodId: string;
}

function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function getZoneComparison(params: ZoneComparisonParams) {
  return apiFetch<ZoneComparison>(`/comparisons/zones${qs(params as Record<string, string>)}`);
}

export async function getMonthOverMonthComparison(params: MonthOverMonthParams = {}) {
  return apiFetch<MonthOverMonthComparison>(
    `/comparisons/month-over-month${qs(params as Record<string, number | undefined>)}`,
  );
}

export async function getBudgetVsActualComparison(params: BudgetVsActualParams) {
  return apiFetch<BudgetVsActualComparison>(
    `/comparisons/budget-vs-actual${qs(params as Record<string, string | number>)}`,
  );
}
