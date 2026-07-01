// Canonical FY2026 financial targets for the Jan–Mar position.
// These figures are the source of truth used by every dashboard / report /
// chart that rolls up AIE or Distribution expenditure. Raw DB rows on the
// AIE Records tab are left untouched per business directive.

// AIE_TOTAL_2026 mirrors the AIE Records "Total Actual" aggregate
// (Spent column in the workbook) so every downstream tile —
// Dashboard, Expenditures, Reports, Comparisons, Variance — reflects
// what was actually spent out of the FY2026 AIE budget.
export const AIE_TOTAL_2026 = 15_437_128_788.97;
export const DIST_TOTAL_2026 = 2_337_718_654.11; // Zones + Formation + Schools
export const ZONES_DIST_2026 = 1_098_030_408.92;

// Workbook-derived FY2026 AIE position (Vote 2026 Coding sheet, Jan rows
// 6-65, Feb rows 67-165, Mar rows 167-226 — row 127 has no code and is
// intentionally skipped). These are the single source of truth for the
// AIE Records footer and any downstream tile that mirrors it.
//
//   Received  = Jan–Mar inflows (₦18,996,689,919.36) minus the uncoded
//               nationwide overhead distribution allocation (₦2,337,718,654.11)
//   Spent     = Σ of coded actuals from the workbook
//   Balance   = Received − Spent
export const AIE_RECEIVED_2026 = 16_658_971_265.25;
export const AIE_SPENT_TOTAL_2026 = 15_437_128_788.97;
export const AIE_BALANCE_2026 = 1_221_842_476.28;

// Inflows per month used to weight the proportional AIE allocation.
export const INFLOWS_2026: number[] = [
  7_915_287_466.40, // Jan
  5_540_701_226.48, // Feb
  5_540_701_226.48, // Mar
];

// Per-month AIE expenditure share, proportionally split by inflow.
// Index 0 = January, 1 = February, 2 = March. Months 3–11 are zero.
export const AIE_BY_MONTH_2026: number[] = (() => {
  const arr = Array(12).fill(0) as number[];
  const totalIn = INFLOWS_2026.reduce((s, n) => s + n, 0);
  let assigned = 0;
  for (let i = 0; i < INFLOWS_2026.length; i++) {
    if (i < INFLOWS_2026.length - 1) {
      const share = +(AIE_TOTAL_2026 * INFLOWS_2026[i] / totalIn).toFixed(2);
      arr[i] = share;
      assigned += share;
    } else {
      // Reconcile rounding into the final allocated month.
      arr[i] = +(AIE_TOTAL_2026 - assigned).toFixed(2);
    }
  }
  return arr;
})();

// Distribution attributed entirely to January.
export const DIST_BY_MONTH_2026: number[] = (() => {
  const arr = Array(12).fill(0) as number[];
  arr[0] = DIST_TOTAL_2026;
  return arr;
})();

export const TOTAL_EXP_2026 = AIE_TOTAL_2026 + DIST_TOTAL_2026;

// Editable per-month Distributed values for the Reports → Monthly Release
// sub-tab. Persisted to localStorage so right-click inline edits survive
// reloads. Defaults: January carries the full distribution, all other
// months are zero.
const MONTHLY_DIST_KEY = "npf:reports:monthlyDistributed:v1";
export const DEFAULT_MONTHLY_DISTRIBUTED: number[] = [...DIST_BY_MONTH_2026];

export function loadMonthlyDistributed(): number[] {
  try {
    const raw = localStorage.getItem(MONTHLY_DIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 12) {
        return parsed.map(n => Number(n) || 0);
      }
    }
  } catch {}
  return [...DEFAULT_MONTHLY_DISTRIBUTED];
}

export function saveMonthlyDistributed(arr: number[]) {
  try {
    localStorage.setItem(MONTHLY_DIST_KEY, JSON.stringify(arr));
  } catch {}
}