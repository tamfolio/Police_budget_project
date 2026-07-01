// Per-code, per-month AIE actual spend for FY 2026, sourced from the
// "Vote 2026 Coding" worksheet only: Jan rows 6-65, Feb rows 67-165,
// and Mar rows 167-226. Month index: 0 = Jan, 1 = Feb, 2 = Mar.
// Codes use the full GIFMIS code (short code prefixed with "22020",
// except 40202 / 40202a which map to 220402).
export const AIE_MONTHLY_ACTUALS_2026: Record<string, Record<number, number>> = {
  // January
  "22020101":  { 0: 133488391.00, 1: 102282614.00, 2:   6608902.07 },
  "22020102":  {                  1:  31478731.00, 2:  23219500.00 },
  "22020103":  { 0:  28000000.00 },
  "22020104":  { 0:  27335000.00 },
  "22020201":  { 0: 375860502.80, 1: 256900000.00, 2: 140000000.00 },
  "22020202":  { 0:   8660000.00 },
  "22020203":  { 0:   5252000.00 },
  "22020301":  { 0: 100000000.00, 1: 496500000.00, 2: 254500000.00 },
  "22020305":  {                                   2:  54298625.70 },
  "22020307":  {                  1:  75000000.00, 2:  27000000.00 },
  "22020308":  {                  1:  50000000.00 },
  "22020309":  { 0: 782681003.54, 1: 850307536.84, 2: 384830143.21 },
  "22020310":  { 0: 280515000.00,                  2:  28000000.00 },
  "22020311":  { 0: 118862500.00,                  2:  65000000.00 },
  "22020401":  { 0:  70710550.00, 1: 722643184.24, 2: 225990242.56 },
  "22020402":  {                  1:  13524513.00, 2:   5852000.00 },
  "22020403":  {                  1: 246254428.31, 2:  90000000.00 },
  "22020404":  {                  1:  72500000.00 },
  "22020405":  {                  1:  39008911.14, 2:  20000000.00 },
  "22020406":  {                  1: 535748450.00, 2: 316191444.11 },
  "22020407":  {                  1: 461028408.33, 2: 148435787.56 },
  "22020408":  {                  1:  50000000.00, 2:  32000000.00 },
  "22020501":  {                  1: 332100337.18, 2:  96500000.00 },
  "22020601":  { 0: 124085000.00, 1:  50000000.00, 2: 588363362.77 },
  "22020605":  { 0:  28994000.00, 1: 332629444.11, 2: 124281882.00 },
  "22020606":  {                                   2:   7469200.00 },
  "22020703":  {                                   2:  21639000.00 },
  "22020801":  {                  1: 849133411.96, 2: 356254428.62 },
  "22020803":  {                  1:  80000000.00, 2:  28000000.00 },
  "22020804":  {                  1: 1035419820.10, 2: 328599294.00 },
  "22020805":  { 0: 614544660.00, 1: 668349987.02, 2: 601101343.24 },
  "22020902":  {                  1:  78199294.00, 2:  32000000.00 },
  "22021001":    {                  1:   3000000.00, 2:   7800000.00 },
  "22021002":    { 0:   7000000.00, 1:  15000000.00 },
  "22021003":    { 0:   1500000.00, 1:  10002858.00, 2:   5000000.00 },
  "22021003(a)": { 0:   3150000.00 },
  "22021004":    {                                   2:  44792051.00 },
  "22021007":    {                  1: 285175007.16 },
  "22021011":    { 0: 200000000.00, 1: 246785000.00, 2: 187576382.40 },
  "22021014":    {                  1:    500000.00, 2:  65500000.00 },
  "22040202":    {                  1: 155214656.00, 2:  65000000.00 },
};

const AUTHORITATIVE_MONTHS_2026 = new Set([0, 1, 2]);

export const isAuthoritativeActualMonth = (fy: number, monthIdx: number) =>
  fy === 2026 && AUTHORITATIVE_MONTHS_2026.has(monthIdx);

/** localStorage key for per-FY, per-code, per-month actual overrides. */
export const monthlySpentKey = (fy: number) => `npf:aieMonthlySpent:${fy}`;

/**
 * One-time migration: clear any stale FY2026 per-cell actual overrides left
 * over from earlier prompts that pre-date the workbook-seeded actuals. After
 * this runs, the AIE Records / Variance / Dashboard views derive Jan/Feb/Mar
 * 2026 actuals straight from AIE_MONTHLY_ACTUALS_2026 (workbook) unless the
 * user explicitly edits a cell afterwards.
 */
const MIGRATION_KEY = "npf:aieMonthlySpent:2026:migration";
const MIGRATION_VERSION = "2026-workbook-v5";
if (typeof localStorage !== "undefined") {
  try {
    if (localStorage.getItem(MIGRATION_KEY) !== MIGRATION_VERSION) {
      localStorage.removeItem(monthlySpentKey(2026));
      localStorage.setItem(MIGRATION_KEY, MIGRATION_VERSION);
    }
  } catch { /* ignore */ }
}

export function getActualOverrides(fy: number): Record<string, Record<number, number>> {
  let overrides: Record<string, Record<number, number>> = {};
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(monthlySpentKey(fy)) : null;
    if (raw) overrides = JSON.parse(raw);
  } catch { return {}; }

  if (fy !== 2026) return overrides;

  const sanitized: Record<string, Record<number, number>> = {};
  for (const [code, months] of Object.entries(overrides)) {
    const cleanMonths: Record<number, number> = {};
    for (const [rawMonth, rawValue] of Object.entries(months ?? {})) {
      const monthIdx = Number(rawMonth);
      if (AUTHORITATIVE_MONTHS_2026.has(monthIdx)) continue;
      cleanMonths[monthIdx] = Number(rawValue) || 0;
    }
    if (Object.keys(cleanMonths).length) sanitized[code] = cleanMonths;
  }

  try {
    if (typeof localStorage !== "undefined" && JSON.stringify(sanitized) !== JSON.stringify(overrides)) {
      if (Object.keys(sanitized).length) localStorage.setItem(monthlySpentKey(fy), JSON.stringify(sanitized));
      else localStorage.removeItem(monthlySpentKey(fy));
    }
  } catch { /* ignore */ }

  return sanitized;
}

/**
 * Compute per-code total actual spend for a given FY, combining the seed data
 * (workbook actuals) with any per-month overrides saved locally. Used by
 * downstream pages (Variance, Dashboard) so every view that depends on AIE
 * actuals stays in sync with the AIE Records tab.
 */
export function getActualByCode(fy: number): Record<string, number> {
  const seed: Record<string, Record<number, number>> =
    fy === 2026 ? AIE_MONTHLY_ACTUALS_2026 : {};
  const overrides = getActualOverrides(fy);
  const out: Record<string, number> = {};
  const codes = new Set<string>([...Object.keys(seed), ...Object.keys(overrides)]);
  codes.forEach(code => {
    const s = seed[code] ?? {};
    const o = overrides[code] ?? {};
    const months = new Set<number>([
      ...Object.keys(s).map(Number),
      ...Object.keys(o).map(Number),
    ]);
    let total = 0;
    months.forEach(mi => {
      total += (o[mi] != null ? Number(o[mi]) : Number(s[mi] || 0)) || 0;
    });
    out[code] = total;
  });
  return out;
}