import { useEffect, useState } from "react";
import { useDashboardFilters } from "@/contexts/DashboardFiltersContext";
import { TrendingUp, Flame, CalendarDays, AlertTriangle } from "lucide-react";
import { listAies } from "@/lib/aiesApi";
import { listExpenditures } from "@/lib/expendituresApi";
import { listFundInflows } from "@/lib/fundInflowsApi";

type Stats = {
  aieApproved: number;
  expApproved: number;
  burn30: number;
  cashOnHand: number;
};

const fmtN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

export function DashboardKpiTiles() {
  const { fy } = useDashboardFilters();
  const [s, setS] = useState<Stats>({ aieApproved: 0, expApproved: 0, burn30: 0, cashOnHand: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const fyParam = fy === "ALL" ? undefined : (fy as number);
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

      const [aieData, expData, fiData] = await Promise.all([
        listAies({ status: "APPROVED", ...(fyParam != null ? { fiscalYear: fyParam } : {}) }),
        listExpenditures({ status: "APPROVED", ...(fyParam != null ? { fiscalYear: fyParam } : {}) }),
        listFundInflows({ status: "APPROVED", ...(fyParam != null ? { fiscalYear: fyParam } : {}) }),
      ]);

      const aieApproved = aieData.reduce((t, r) => t + Number(r.totalAmount || 0), 0);
      const expApproved = expData.reduce((t, r) => t + Number(r.grossAmount || 0), 0);
      const burn30 = expData.filter(r => r.expenseDate >= since30).reduce((t, r) => t + Number(r.grossAmount || 0), 0);
      const inflowApproved = fiData.reduce((t, r) => t + Number(r.amount || 0), 0);
      const cashOnHand = Math.max(inflowApproved - expApproved, 0);
      setS({ aieApproved, expApproved, burn30, cashOnHand });
      setLoading(false);
    })();
  }, [fy]);

  const utilization = s.aieApproved > 0 ? (s.expApproved / s.aieApproved) * 100 : 0;
  const daily = s.burn30 / 30;
  const daysCover = daily > 0 ? Math.floor(s.cashOnHand / daily) : null;

  // Variance flag: >90% utilised (overspend risk) or <25% utilised when >50% through the FY (under-spend)
  const today = new Date();
  const elapsedFracOfYear = (today.getMonth() + 1) / 12;
  let variance: { kind: "OVER" | "UNDER" | "OK"; note: string } = { kind: "OK", note: "Within tolerance" };
  if (utilization > 90) variance = { kind: "OVER", note: "Utilisation >90% — overspend risk" };
  else if (utilization < 25 && elapsedFracOfYear > 0.5) variance = { kind: "UNDER", note: `Only ${fmtPct(utilization)} used past mid-year` };

  const tiles = [
    {
      label: "% Utilization", value: loading ? "…" : fmtPct(utilization),
      sub: `${fmtN(s.expApproved)} of ${fmtN(s.aieApproved)} AIE`,
      icon: TrendingUp,
      tone: utilization > 90 ? "text-destructive" : utilization > 75 ? "text-amber-600 dark:text-amber-400" : "text-foreground",
    },
    {
      label: "Burn Rate (30d)", value: loading ? "…" : fmtN(s.burn30),
      sub: daily > 0 ? `${fmtN(daily)} / day` : "no spend",
      icon: Flame, tone: "text-foreground",
    },
    {
      label: "Days of Cover", value: loading ? "…" : daysCover == null ? "—" : `${daysCover}d`,
      sub: `${fmtN(s.cashOnHand)} cash on hand`,
      icon: CalendarDays,
      tone: daysCover != null && daysCover < 30 ? "text-destructive" : "text-foreground",
    },
    {
      label: "Variance Flag", value: loading ? "…" : variance.kind,
      sub: variance.note,
      icon: AlertTriangle,
      tone: variance.kind === "OK" ? "text-emerald-600 dark:text-emerald-400" : variance.kind === "OVER" ? "text-destructive" : "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {tiles.map(t => (
        <div key={t.label} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t.label}</p>
            <t.icon className={`h-4 w-4 ${t.tone}`} />
          </div>
          <p className={`text-2xl font-bold font-serif mt-1 ${t.tone}`}>{t.value}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{t.sub}</p>
        </div>
      ))}
    </div>
  );
}
