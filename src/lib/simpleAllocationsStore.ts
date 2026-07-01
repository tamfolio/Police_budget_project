import type { SimplePeriod, SimpleSection } from "@/data/formationAllocations";

export function makeStore(storageKey: string, eventName: string, seed: SimplePeriod[]) {
  const load = (): SimplePeriod[] => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as SimplePeriod[];
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch {}
    return seed;
  };
  const save = (periods: SimplePeriod[]) => {
    try { localStorage.setItem(storageKey, JSON.stringify(periods)); } catch {}
    try { window.dispatchEvent(new CustomEvent(eventName)); } catch {}
  };
  const subscribe = (cb: () => void) => {
    const h = () => cb();
    window.addEventListener(eventName, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(eventName, h);
      window.removeEventListener("storage", h);
    };
  };
  return { load, save, subscribe };
}

export function cloneZeroedSections(src: SimpleSection[] | undefined, nCols: number): SimpleSection[] {
  if (!src) return [];
  return src.map(s => ({
    name: s.name,
    provisions: Array.from({ length: nCols }, () => 0),
    items: s.items.map(it => ({
      sno: it.sno, desc: it.desc, code: it.code,
      amounts: Array.from({ length: nCols }, () => null as number | null),
    })),
  }));
}