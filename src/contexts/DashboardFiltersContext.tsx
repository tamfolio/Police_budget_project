import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { FISCAL_YEARS } from "@/data/constants";

// `fy` stays in the context for backward-compatibility with other pages, but
// the Dashboard now exposes Month (1–12) and Zone (1–17) filters instead.
type Filters = {
  fy: number | "ALL";
  month: number | "ALL";          // 1-12
  zoneId: number | "ALL";         // NPF zone id
};
type Ctx = Filters & {
  setFy: (v: Filters["fy"]) => void;
  setMonth: (v: Filters["month"]) => void;
  setZoneId: (v: Filters["zoneId"]) => void;
  reset: () => void;
};

const KEY = "dashboard-filters-v2";
const defaults: Filters = { fy: 2026, month: "ALL", zoneId: "ALL" };

const C = createContext<Ctx | null>(null);

export function DashboardFiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return { ...defaults, ...JSON.parse(raw) };
    } catch {}
    return defaults;
  });

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(filters)); } catch {}
  }, [filters]);

  const value: Ctx = {
    ...filters,
    setFy: (fy) => setFilters(f => ({ ...f, fy })),
    setMonth: (month) => setFilters(f => ({ ...f, month })),
    setZoneId: (zoneId) => setFilters(f => ({ ...f, zoneId })),
    reset: () => setFilters(defaults),
  };
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useDashboardFilters() {
  const ctx = useContext(C);
  if (!ctx) throw new Error("useDashboardFilters must be used inside DashboardFiltersProvider");
  return ctx;
}

export { FISCAL_YEARS };