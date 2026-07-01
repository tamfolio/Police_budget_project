import { useEffect, useMemo, useState } from "react";
import { useDashboardFilters } from "@/contexts/DashboardFiltersContext";
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, Line } from "recharts";
import { formatNaira } from "@/data/constants";
import { MonthDrilldownDialog } from "@/components/MonthDrilldownDialog";
import { getInflowVsExpenditureChart, type InflowVsExpenditurePoint } from "@/lib/dashboardApi";

type Row = InflowVsExpenditurePoint & { monthIndex: number };

const fmtTooltip = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

export function DashboardTrendChart() {
  const { fy, month } = useDashboardFilters();
  const fyNum = fy === "ALL" ? 2026 : fy;
  const [rawData, setRawData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [drillMonth, setDrillMonth] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const points = await getInflowVsExpenditureChart(fyNum);
        const rows: Row[] = (points ?? []).map((p, i) => ({ ...p, monthIndex: i }));
        if (!cancelled) setRawData(rows);
      } catch {
        if (!cancelled) setRawData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fyNum]);

  const data = useMemo(() => {
    if (month === "ALL") return rawData;
    return rawData.filter(r => r.monthIndex === month - 1);
  }, [rawData, month]);

  const hasData = useMemo(() => data.some(d => d["Fund Inflow"] || d["Total Expenditure"]), [data]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-bold font-serif">Fund Inflow vs Total Expenditure · FY {fyNum}</h2>
        <span className="text-[11px] text-muted-foreground">{loading ? "Loading…" : hasData ? "Click a bar to drill down" : "No data yet"}</span>
      </div>
      <div className="h-[280px] p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
            onClick={(state: any) => {
              const idx = state?.activeTooltipIndex;
              if (typeof idx === "number" && data[idx]) setDrillMonth(data[idx].monthIndex);
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNaira(Number(v))} width={64} />
            <Tooltip
              formatter={(v: any) => fmtTooltip(Number(v))}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Fund Inflow" fill="hsl(var(--primary))" radius={[4,4,0,0]} className="cursor-pointer" />
            <Bar dataKey="Total Expenditure" fill="hsl(var(--destructive) / 0.35)" radius={[4,4,0,0]} className="cursor-pointer" />
            <Line type="monotone" dataKey="Total Expenditure" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3, className: "cursor-pointer" }} legendType="none" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <MonthDrilldownDialog
        open={drillMonth !== null}
        onOpenChange={(b) => { if (!b) setDrillMonth(null); }}
        fy={fy}
        monthIndex={drillMonth}
      />
    </div>
  );
}
