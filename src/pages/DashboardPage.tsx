import { useEffect, useMemo, useState } from "react";
import { fmtInt } from "@/lib/reportUtils";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABEL } from "@/lib/roles";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { DashboardFiltersBar } from "@/components/DashboardFiltersBar";
import { DashboardTrendChart } from "@/components/DashboardTrendChart";
import { RecentActivityFeed } from "@/components/RecentActivityFeed";
import { PendingApprovalsWidget } from "@/components/PendingApprovalsWidget";
import { useDashboardFilters } from "@/contexts/DashboardFiltersContext";
import { CAPITAL_BUDGET_2026 } from "@/data/capitalBudget2026";
import { getDashboardCards, type DashboardCards } from "@/lib/dashboardApi";

const fmtNaira = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency", currency: "NGN",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n || 0);

export default function DashboardPage() {
  const { user, roles } = useAuth();
  const { fy, month } = useDashboardFilters();

  const [cards, setCards] = useState<DashboardCards | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" :
    hour < 17 ? "Good afternoon" :
    hour < 21 ? "Good evening" :
    "Good night";

  const displayName =
    user?.fullName ||
    user?.email?.split("@")[0] ||
    "there";

  useEffect(() => { document.title = "Dashboard – NPF BMS"; }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const monthParam = month !== "ALL" ? String(month) : undefined;
        const data = await getDashboardCards(monthParam);
        if (!cancelled) setCards(data);
      } catch {
        // keep previous state on error
      }
    })();
    return () => { cancelled = true; };
  }, [month]);

  const totalCapitalAppropriation = useMemo(
    () => CAPITAL_BUDGET_2026.reduce((s, r) => s + r.amount, 0),
    [],
  );

  const tiles = useMemo(() => ([
    {
      label: "Fund Inflow",
      value: fmtNaira(cards?.totalFundInflow ?? 0),
      sub: `${fmtInt(cards?.fundInflowCount ?? 0)} record${(cards?.fundInflowCount ?? 0) === 1 ? "" : "s"}`,
      to: "/fund-inflows",
    },
    {
      label: "AIE Records",
      value: fmtInt(cards?.aieCount ?? 0),
      sub: "Total records on file",
      to: "/aie",
    },
    {
      label: "Expenditures",
      value: fmtNaira(cards?.totalExpenditure ?? 0),
      sub: "AIE + Distributions",
      to: "/expenditures",
    },
    {
      label: "% Utilisation",
      value: `${((cards?.utilization ?? 0) * 100).toFixed(1)}%`,
      sub: "Expenditure ÷ Fund Inflow",
      to: "/reports",
    },
    {
      label: "AIE Monthly Carry-Over",
      value: fmtNaira(cards?.aieCarryOver ?? 0),
      sub: "Balance yet to distribute",
      to: "/aie",
    },
    {
      label: "Total Capital Appropriation",
      value: fmtNaira(totalCapitalAppropriation),
      sub: `${CAPITAL_BUDGET_2026.length} capital projects (FY ${fy === "ALL" ? 2026 : fy})`,
      to: "/capital-budget",
    },
  ]), [cards, totalCapitalAppropriation, fy]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold font-serif">{greeting}, {displayName}</h1>
        <p className="text-[12px] text-muted-foreground">
          Roles: {roles.length ? roles.map(r => ROLE_LABEL[r]).join(", ") : "No role assigned yet — contact your System Administrator."}
        </p>
      </div>

      <DashboardFiltersBar />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {tiles.map(t => (
          <Link
            key={t.label}
            to={t.to}
            className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Open ${t.label}`}
          >
            <div className="flex items-start justify-between">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t.label}</p>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-primary" />
            </div>
            <p className="text-xl font-bold font-serif mt-1 group-hover:text-primary transition-colors break-words">{t.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{t.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><DashboardTrendChart /></div>
        <div className="space-y-4">
          <PendingApprovalsWidget />
        </div>
      </div>

      <RecentActivityFeed />
    </div>
  );
}
