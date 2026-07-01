import { apiFetch } from "@/lib/apiClient";

/** Supported frontend tabs for the Distributions module. */
export type DistributionView = "zone" | "formations" | "schools" | "summary";

// ─── Zone view ────────────────────────────────────────────────────────────────
export interface DistributionLineItem {
  sno: string | number | null;
  desc: string;
  code: string;
  amounts: Array<number | null>;
}

export interface DistributionZoneFormation {
  name: string;
  sno: string;
  provision: number;
  snos: string[];
  provisions: number[];
  items: DistributionLineItem[];
  totals: number[];
}

export interface DistributionZoneGroups {
  zone1_6: DistributionZoneFormation[];
  zone7_12: DistributionZoneFormation[];
  zone13_17: DistributionZoneFormation[];
}

export interface DistributionZonePeriod {
  id: string;
  label: string;
  columns: string[];
  data: DistributionZoneGroups;
}

// ─── Simple view (formations / schools) ───────────────────────────────────────
export interface DistributionSimpleItem {
  sno: string;
  desc: string;
  code: string;
  amounts: Array<number | null>;
}

export interface DistributionSimpleSection {
  name: string;
  provisions: number[];
  items: DistributionSimpleItem[];
}

export interface DistributionSimplePeriod {
  id: string;
  label: string;
  columns: string[];
  sections: DistributionSimpleSection[];
}

// ─── Summary view ─────────────────────────────────────────────────────────────
export interface DistributionSummaryRow {
  name: string;
  allocation: number;
  fromDist: number;
}

export interface DistributionSummaryPeriod {
  id: string;
  label: string;
  rows: DistributionSummaryRow[];
}

export type DistributionPayload =
  | DistributionZonePeriod
  | DistributionSimplePeriod
  | DistributionSummaryPeriod;

export interface DistributionAuditEntry {
  action: string;
  actor?: string | null;
  actorName?: string | null;
  remarks?: string | null;
  createdAt: string;
  [key: string]: unknown;
}

function qs(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/**
 * Get the empty add-period template the API expects for a given tab.
 * Useful as the starting point for "Add Period" dialogs.
 */
export async function getDistributionTemplate<T extends DistributionPayload = DistributionPayload>(
  view: DistributionView,
  periodId?: string,
) {
  return apiFetch<T>(`/distributions/template${qs({ view, periodId })}`);
}

/** Get seeded reference data: zones, formations, and schools. */
export async function getDistributionReference<T = Record<string, unknown>>() {
  return apiFetch<T>(`/distributions/reference`);
}

/** Seed distribution reference data and starter periods. Admin-only. */
export async function seedAllDistributions<T = Record<string, unknown>>() {
  return apiFetch<T>(`/distributions/seed-all`, { method: "POST" });
}

/** List every period for a tab. */
export async function listDistributionPeriods<T extends DistributionPayload = DistributionPayload>(
  view: DistributionView,
): Promise<T[]> {
  const data = await apiFetch<T | T[]>(`/distributions${qs({ view })}`);
  return Array.isArray(data) ? data : data ? [data] : [];
}

/** Get one period for a tab. */
export async function getDistributionPeriod<T extends DistributionPayload = DistributionPayload>(
  view: DistributionView,
  periodId: string,
) {
  return apiFetch<T>(`/distributions${qs({ view, periodId })}`);
}

/** Create a new period for a tab. Body must match the tab's payload shape. */
export async function createDistributionPeriod<T extends DistributionPayload>(
  view: DistributionView,
  payload: T,
) {
  return apiFetch<T>(`/distributions${qs({ view })}`, {
    method: "POST",
    body: payload,
  });
}

/**
 * Update an existing period for a tab. `payload.id` must equal `periodId`.
 */
export async function updateDistributionPeriod<T extends DistributionPayload>(
  view: DistributionView,
  periodId: string,
  payload: T,
) {
  return apiFetch<T>(`/distributions/${encodeURIComponent(periodId)}${qs({ view })}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteDistributionPeriod(view: DistributionView, periodId: string) {
  return apiFetch<unknown>(
    `/distributions/${encodeURIComponent(periodId)}${qs({ view })}`,
    { method: "DELETE" },
  );
}

// ─── Approval workflow ────────────────────────────────────────────────────────
export async function submitDistributionPeriod(periodId: string) {
  return apiFetch<unknown>(`/distributions/${encodeURIComponent(periodId)}/submit`, {
    method: "POST",
  });
}

export async function reviewDistributionPeriod(periodId: string) {
  return apiFetch<unknown>(`/distributions/${encodeURIComponent(periodId)}/review`, {
    method: "POST",
  });
}

export async function approveDistributionPeriod(periodId: string) {
  return apiFetch<unknown>(`/distributions/${encodeURIComponent(periodId)}/approve`, {
    method: "POST",
  });
}

export async function returnDistributionPeriod(periodId: string, remarks: string) {
  return apiFetch<unknown>(`/distributions/${encodeURIComponent(periodId)}/return`, {
    method: "POST",
    body: { remarks },
  });
}

export async function getDistributionAuditTrail(periodId: string) {
  const data = await apiFetch<DistributionAuditEntry[] | { entries?: DistributionAuditEntry[] }>(
    `/distributions/${encodeURIComponent(periodId)}/audit-trail`,
  );
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as { entries?: DistributionAuditEntry[] }).entries)) {
    return (data as { entries: DistributionAuditEntry[] }).entries;
  }
  return [];
}