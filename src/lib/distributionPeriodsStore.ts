import { SEED_PERIODS, type Period, type ZoneGroups, type ZoneGroupKey } from "@/data/distributionBreakdown";

export const PERIODS_STORAGE_KEY = "npf:distributionBreakdown:v5";
export const PERIODS_EVENT = "npf:periods-updated";

const GROUP_KEYS: ZoneGroupKey[] = ["zone1_6", "zone7_12", "zone13_17"];

export function loadPeriods(): Period[] {
  try {
    const raw = localStorage.getItem(PERIODS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Period[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {}
  return SEED_PERIODS;
}

export function savePeriods(periods: Period[]) {
  try { localStorage.setItem(PERIODS_STORAGE_KEY, JSON.stringify(periods)); } catch {}
  try { window.dispatchEvent(new CustomEvent(PERIODS_EVENT)); } catch {}
}

export function subscribePeriods(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(PERIODS_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(PERIODS_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/** Clone the structure of a period with all amounts zeroed, used as template for new periods. */
export function cloneZeroedZoneGroups(src: ZoneGroups | undefined, nCols: number): ZoneGroups {
  const base: ZoneGroups = { zone1_6: [], zone7_12: [], zone13_17: [] };
  if (!src) return base;
  for (const gk of GROUP_KEYS) {
    base[gk] = (src[gk] || []).map(f => ({
      ...f,
      provision: 0,
      snos: Array.from({ length: nCols }, (_, i) => (f.snos && f.snos[i]) || ""),
      provisions: Array.from({ length: nCols }, () => 0),
      totals: Array.from({ length: nCols }, () => 0),
      items: f.items.map(it => ({ sno: it.sno, desc: it.desc, code: it.code, amounts: Array.from({ length: nCols }, () => null as number | null) })),
    }));
  }
  return base;
}