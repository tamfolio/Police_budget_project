// Centralised aggregation across the 3 Distribution sub-tabs (Zones,
// Formation, Schools). Everywhere in the app that needs a "Total
// Distribution" figure — Dashboard KPIs, Expenditures tab, charts — must
// read from here so the number is always derived dynamically from the
// data the user has entered.
import { useEffect, useState } from "react";
import { SEED_PERIODS, type Period, type ZoneGroupKey } from "@/data/distributionBreakdown";
import { SEED_FORMATION_PERIODS, type SimplePeriod } from "@/data/formationAllocations";
import { SEED_SCHOOL_PERIODS } from "@/data/schoolAllocations";
import { toFullCode } from "@/lib/budgetCodes";

export const ZONES_STORAGE_KEY = "npf:distributionBreakdown:v5";
export const FORMATION_STORAGE_KEY = "npf:formationAllocations:v1";
export const SCHOOLS_STORAGE_KEY = "npf:schoolAllocations:v1";

export const FORMATION_EVENT = "npf:formationAllocations-updated";
export const SCHOOLS_EVENT = "npf:schoolAllocations-updated";
export const ZONES_EVENT = "npf:periods-updated";

const GROUP_KEYS: ZoneGroupKey[] = ["zone1_6", "zone7_12", "zone13_17"];

/**
 * Skip sub-total / grand-total rows that some seeded sheets embed as bare
 * rows (no sno, no desc, no code) carrying the section total in the
 * amounts column. Also skip rows whose description literally reads "Total"
 * or "Sub-total", since these duplicate the line-item sum above them.
 */
export function isTotalRow(it: { sno?: any; desc?: string; code?: string }): boolean {
  const desc = (it.desc || "").trim().toLowerCase();
  const code = (it.code || "").trim();
  const sno = String(it.sno ?? "").trim();
  const snoLabel = sno.toLowerCase();
  if (!desc && !code && !sno) return true;
  if (!code && /^(grand\s+|sub[\s-]*)?total\b/.test(snoLabel)) return true;
  if (/^(grand\s+|sub[\s-]*)?total\b/.test(desc)) return true;
  return false;
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed as T;
    }
  } catch {}
  return fallback;
}

export const loadZonesPeriods = (): Period[] => loadJson(ZONES_STORAGE_KEY, SEED_PERIODS);
export const loadFormationPeriods = (): SimplePeriod[] => loadJson(FORMATION_STORAGE_KEY, SEED_FORMATION_PERIODS);
export const loadSchoolPeriods = (): SimplePeriod[] => loadJson(SCHOOLS_STORAGE_KEY, SEED_SCHOOL_PERIODS);

const sumAmounts = (arr: (number | null | undefined)[] | undefined, limit?: number) =>
  (limit == null ? (arr ?? []) : (arr ?? []).slice(0, limit)).reduce<number>((s, x) => s + (Number(x) || 0), 0);

export function zoneAmountColumnCount(period: { columns?: unknown[] }): number {
  const count = period.columns?.length ?? 0;
  return count > 1 ? count - 1 : count;
}

export function sumZones(periods = loadZonesPeriods()): number {
  let t = 0;
  for (const p of periods) {
    const amountColumns = zoneAmountColumnCount(p);
    for (const gk of GROUP_KEYS) for (const f of (p.data[gk] || []))
      for (const it of f.items) { if (isTotalRow(it)) continue; t += sumAmounts(it.amounts, amountColumns); }
  }
  return t;
}

export function sumSimple(periods: SimplePeriod[]): number {
  let t = 0;
  for (const p of periods) for (const s of p.sections) for (const it of s.items)
    { if (isTotalRow(it)) continue; t += sumAmounts(it.amounts); }
  return t;
}

export const sumFormation = (p = loadFormationPeriods()) => sumSimple(p);
export const sumSchools = (p = loadSchoolPeriods()) => sumSimple(p);

export function getTotalDistribution(): number {
  return sumZones() + sumFormation() + sumSchools();
}

/**
 * Aggregate amounts by FULL budget code across Formation + Schools sub-tabs.
 * Codes are normalised to their full GIFMIS form so they merge cleanly with
 * Zones / AIE roll-ups.
 */
export function aggregateFormationAndSchoolsByCode(): Record<string, number> {
  const m: Record<string, number> = {};
  const add = (code: string | undefined, amt: number) => {
    const full = toFullCode(code);
    if (!full) return;
    m[full] = (m[full] || 0) + amt;
  };
  for (const p of loadFormationPeriods())
    for (const s of p.sections) for (const it of s.items) {
      if (isTotalRow(it)) continue;
      add(it.code, sumAmounts(it.amounts));
    }
  for (const p of loadSchoolPeriods())
    for (const s of p.sections) for (const it of s.items) {
      if (isTotalRow(it)) continue;
      add(it.code, sumAmounts(it.amounts));
    }
  return m;
}

/** Aggregate Zones amounts by full code. */
export function aggregateZonesByCode(): Record<string, number> {
  const m: Record<string, number> = {};
  for (const p of loadZonesPeriods()) {
    const amountColumns = zoneAmountColumnCount(p);
    for (const gk of GROUP_KEYS) for (const f of (p.data[gk] || []))
      for (const it of f.items) {
        if (isTotalRow(it)) continue;
        const full = toFullCode(it.code);
        if (!full) continue;
        m[full] = (m[full] || 0) + sumAmounts(it.amounts, amountColumns);
      }
  }
  return m;
}

/** Combined Zones + Formation + Schools aggregated by full code. */
export function aggregateAllDistributionByCode(): Record<string, number> {
  const out = aggregateZonesByCode();
  const fs = aggregateFormationAndSchoolsByCode();
  for (const [k, v] of Object.entries(fs)) out[k] = (out[k] || 0) + v;
  return out;
}

/** Subscribe to changes from any of the 3 sub-tab stores. */
export function subscribeDistribution(cb: () => void): () => void {
  const events = [FORMATION_EVENT, SCHOOLS_EVENT, ZONES_EVENT, "storage"];
  events.forEach(e => window.addEventListener(e, cb));
  return () => events.forEach(e => window.removeEventListener(e, cb));
}

/** React hook returning the live dynamic Total Distribution figure. */
export function useTotalDistribution(): number {
  const [v, setV] = useState<number>(() => getTotalDistribution());
  useEffect(() => {
    const recompute = () => setV(getTotalDistribution());
    recompute();
    return subscribeDistribution(recompute);
  }, []);
  return v;
}

/** React hook returning per-tab totals. */
export function useDistributionBreakdown() {
  const [v, setV] = useState(() => ({
    zones: sumZones(),
    formation: sumFormation(),
    schools: sumSchools(),
  }));
  useEffect(() => {
    const recompute = () => setV({ zones: sumZones(), formation: sumFormation(), schools: sumSchools() });
    recompute();
    return subscribeDistribution(recompute);
  }, []);
  return { ...v, total: v.zones + v.formation + v.schools };
}