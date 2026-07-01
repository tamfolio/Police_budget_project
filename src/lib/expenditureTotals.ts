// Centralised expenditure aggregation so the Dashboard "Expenditures" tile
// and the Expenditures tab's "Total Expenditure" pill stay identical.
//
// Mirrors the logic in ExpendituresPage exactly:
//   - Distributions: sum of every line-item amount across every saved
//     bi-monthly Period in localStorage (key "npf:distributionBreakdown:v5"),
//     falling back to SEED_PERIODS when nothing has been saved yet.
//   - AIE: sum of aie_lines.amount, plus aie_records.amount for any AIE row
//     that has no child lines.
import { SEED_PERIODS } from "@/data/distributionBreakdown";
import { SEED_SUMMARY_TABLE1 } from "@/data/distributionBreakdown";
import { useEffect, useState } from "react";
import {
  AIE_TOTAL_2026,
  AIE_BY_MONTH_2026,
  DIST_BY_MONTH_2026,
} from "@/data/fy2026Targets";
import { listAies } from "@/lib/aiesApi";
import { getTotalDistribution, subscribeDistribution } from "@/lib/distributionAggregation";

const STORAGE_KEY = "npf:distributionBreakdown:v5";
const SUMMARY_STORAGE_KEY = "npf:distributionSummary:v1";
const GROUP_KEYS = ["zone1_6", "zone7_12", "zone13_17"] as const;

const MONTH_NAMES = [
  "january","february","march","april","may","june",
  "july","august","september","october","november","december",
];

export function loadDistributionPeriods() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {}
  return SEED_PERIODS;
}

/**
 * Canonical Total Distribution figure — sourced from the Distributions tab's
 * Summary sub-tab (Table 1, "From Distribution" column). Everywhere in the app
 * that needs a "Total Distribution" number must use this function so the
 * Dashboard, Expenditures, Reports and charts all stay in sync with whatever
 * the user has entered on the Summary tab.
 */
export function getTotalDistributionFromSummary(): number {
  try {
    const raw = localStorage.getItem(SUMMARY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const t1 = Array.isArray(parsed?.table1) ? parsed.table1 : null;
      if (t1) return t1.reduce((s: number, r: any) => s + (Number(r?.fromDist) || 0), 0);
    }
  } catch {}
  return SEED_SUMMARY_TABLE1.reduce((s, r) => s + (Number(r.fromDist) || 0), 0);
}

// Sum every line-item amount across every saved bi-monthly Period in the
// Distributions breakdown grid. This is the original Total Distribution
// source used by the Dashboard, Expenditures, and Reports tabs.
export function sumDistributions(periods = loadDistributionPeriods()): number {
  // Total Distribution = Zones + Formation + Schools, derived live from the
  // 3 Distribution sub-tabs (never hard-coded).
  return getTotalDistribution();
}

/**
 * Distributions attributed to a single calendar month (0=Jan).
 * Convention: each bi-monthly batch is treated as fully disbursed in the
 * FIRST month of its period (e.g. a "January–February" batch contributes to
 * January only). This matches the Comparisons tab "This Month vs Last Month"
 * semantics requested by the budget office.
 */
export function sumDistributionsForMonth(
  monthIndex: number,
  periods = loadDistributionPeriods(),
): number {
  // The full FY2026 distribution was drawn from the January inflow, so the
  // dynamic total maps to January only and other months are zero.
  if (monthIndex !== 0) return 0;
  return getTotalDistribution();
}

export function sumAie(
  aies: { id: string; amount: number }[],
  lines: { aie_id: string; amount: number }[],
): number {
  const lineSum = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const aieIdsWithLines = new Set(lines.map(l => l.aie_id));
  const lonelyAie = aies
    .filter(a => !aieIdsWithLines.has(a.id))
    .reduce((s, a) => s + (Number(a.amount) || 0), 0);
  return lineSum + lonelyAie;
}

/**
 * Single source of truth for the "Total Expenditure" figure shown on the
 * Dashboard, Expenditures tab, Reports tab and Comparisons tab.
 *
 * Total = sum of AIE expenditure (lines, falling back to record amount when
 * an AIE has no line breakdown) + sum of every distribution amount entered
 * on the Distributions breakdown grid.
 *
 * Pass { fy, month } to scope the figure to a fiscal year and/or a specific
 * calendar month (1–12). Omit `month` (or pass "ALL") for the unfiltered
 * grand total — the ₦17,767,102,272.01 reference figure when seed data
 * is in place.
 */
export function useTotalExpenditure(opts: {
  fy?: number | "ALL";
  month?: number | "ALL";
} = {}): { aieTotal: number; distTotal: number; total: number; loading: boolean } {
  const { fy = "ALL", month = "ALL" } = opts;
  const [state, setState] = useState({ aieTotal: 0, distTotal: 0, total: 0, loading: true });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Canonical FY2026 AIE expenditure overrides the DB roll-up so every
      // dashboard / report / chart reflects the agreed Jan–Mar position.
      const fy2026 = fy === "ALL" || fy === 2026;
      let aieTotal = 0;
      if (fy2026) {
        aieTotal = month === "ALL"
          ? AIE_TOTAL_2026
          : (AIE_BY_MONTH_2026[(month as number) - 1] || 0);
      } else {
        const apiAies = await listAies({ fiscalYear: fy as number });
        const monthMatch = (iso: string) => {
          if (month === "ALL") return true;
          return new Date(iso).getMonth() + 1 === month;
        };
        const scopedAies = apiAies.filter(a => monthMatch(a.issueDate));
        aieTotal = scopedAies.reduce((sum, a) => {
          if (a.lineItems && a.lineItems.length > 0) {
            return sum + a.lineItems.reduce((s, l) => s + Number(l.amount), 0);
          }
          return sum + Number(a.totalAmount || 0);
        }, 0);
      }

      const distTotal =
        month === "ALL" ? sumDistributions() : sumDistributionsForMonth((month as number) - 1);

      if (cancelled) return;
      setState({ aieTotal, distTotal, total: aieTotal + distTotal, loading: false });
    })();
    return () => { cancelled = true; };
  }, [fy, month]);

  // Recompute distribution piece live when any sub-tab is edited.
  useEffect(() => {
    return subscribeDistribution(() => {
      setState(s => {
        const distTotal = month === "ALL" ? sumDistributions() : sumDistributionsForMonth((month as number) - 1);
        return { ...s, distTotal, total: s.aieTotal + distTotal };
      });
    });
  }, [month]);

  return state;
}