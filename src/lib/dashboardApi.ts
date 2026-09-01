import { apiFetch } from "@/lib/apiClient";

export interface DashboardCards {
  totalFundInflow: number;
  fundInflowCount: number;
  aieCount: number;
  totalExpenditure: number;
  aieCarryOver: number;
  utilization: number;
}

export interface InflowVsExpenditurePoint {
  name: string;
  "Fund Inflow": number;
  "Total Expenditure": number;
}

export async function getDashboardCards(month?: string) {
  const q = month ? `?month=${encodeURIComponent(month)}` : "";
  return apiFetch<DashboardCards>(`/dashboard/cards${q}`);
}

export async function getInflowVsExpenditureChart(year?: string | number) {
  const q = year !== undefined ? `?year=${encodeURIComponent(String(year))}` : "";
  return apiFetch<InflowVsExpenditurePoint[]>(`/dashboard/inflow-vs-expenditure-chart${q}`);
}
