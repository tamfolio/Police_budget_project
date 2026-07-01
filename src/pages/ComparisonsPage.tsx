import { useEffect, useMemo, useState } from "react";
import { formatNaira } from "@/data/constants";
import { listFundInflows } from "@/lib/fundInflowsApi";
import { listAies } from "@/lib/aiesApi";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ResponsiveContainer, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar } from "recharts";
import VarianceReportPage from "@/pages/VarianceReportPage";
import { loadDistributionPeriods, sumDistributionsForMonth } from "@/lib/expenditureTotals";
import { groupByZone } from "@/lib/zoneGrouping";
import { isTotalRow, zoneAmountColumnCount } from "@/lib/distributionAggregation";


const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const BI_MONTHS: { id: string; label: string; months: number[] }[] = [
  { id: "jan-feb", label: "January–February", months: [0, 1] },
  { id: "mar-apr", label: "March–April",     months: [2, 3] },
  { id: "may-jun", label: "May–June",        months: [4, 5] },
  { id: "jul-aug", label: "July–August",     months: [6, 7] },
  { id: "sep-oct", label: "September–October", months: [8, 9] },
  { id: "nov-dec", label: "November–December", months: [10, 11] },
];

function Tile({ label, value, delta }: { label: string; value: string; delta?: string }) {
  const positive = delta && !delta.startsWith("-") && delta !== "—";
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base font-bold font-serif tabular-nums mt-1">{value}</p>
      {delta && (
        <p className={`text-[11px] mt-0.5 tabular-nums ${delta === "—" ? "text-muted-foreground" : positive ? "text-green-700" : "text-destructive"}`}>
          {delta === "—" ? "no baseline" : `${positive ? "▲" : "▼"} ${delta}`}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Zone vs Zone — Zones 1–17 compared by bi-monthly period using Distributions
// breakdown localStorage data.
// ---------------------------------------------------------------------------

const ZONE_OPTIONS = Array.from({ length: 17 }, (_, i) => i + 1);

type ZoneTotals = Record<number, number>;

function computeZoneTotalsForPeriod(periodIndex: number): ZoneTotals {
  const periods = loadDistributionPeriods();
  if (!periods.length) return {};
  // Periods in localStorage represent saved bi-monthly entries. We pair them
  // to the requested calendar bi-month by index when available, otherwise we
  // aggregate every saved period that maps onto the same months.
  const out: ZoneTotals = {};
  const all = periods[Math.min(periodIndex, periods.length - 1)];
  if (!all) return out;
  const amountColumns = zoneAmountColumnCount(all);
  const flat = [
    ...(all.data?.zone1_6 || []),
    ...(all.data?.zone7_12 || []),
    ...(all.data?.zone13_17 || []),
  ];
  const grouped = groupByZone(flat);
  for (const g of grouped) {
    if (g.zoneNumber < 1) continue;
    let sum = 0;
    for (const f of g.formations) {
      for (const it of (f.items || [])) {
        if (isTotalRow(it)) continue;
        for (const a of (it.amounts || []).slice(0, amountColumns)) sum += Number(a) || 0;
      }
    }
    out[g.zoneNumber] = (out[g.zoneNumber] || 0) + sum;
  }
  return out;
}

function ZoneVsZone() {
  const [periodIdx, setPeriodIdx] = useState(0);
  const [zoneA, setZoneA] = useState(1);
  const [zoneB, setZoneB] = useState(2);

  const totals = useMemo(() => computeZoneTotalsForPeriod(periodIdx), [periodIdx]);
  const a = totals[zoneA] || 0;
  const b = totals[zoneB] || 0;

  const chart = [
    { label: `Zone ${zoneA}`, Amount: a },
    { label: `Zone ${zoneB}`, Amount: b },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 max-w-2xl">
        <div>
          <Label>Bi-monthly period</Label>
          <Select value={String(periodIdx)} onValueChange={v => setPeriodIdx(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {BI_MONTHS.map((p, i) => (
                <SelectItem key={p.id} value={String(i)}>{p.label} 2026</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Zone A</Label>
          <Select value={String(zoneA)} onValueChange={v => setZoneA(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ZONE_OPTIONS.map(z => <SelectItem key={z} value={String(z)}>Zone {z}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Zone B</Label>
          <Select value={String(zoneB)} onValueChange={v => setZoneB(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ZONE_OPTIONS.map(z => <SelectItem key={z} value={String(z)}>Zone {z}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-[12px]">
        <Tile label={`Zone ${zoneA} distribution`} value={formatNaira(a)} />
        <Tile label={`Zone ${zoneB} distribution`} value={formatNaira(b)} />
      </div>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNaira(Number(v))} width={80} />
            <Tooltip formatter={(v: any) => formatNaira(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Source: Distributions tab breakdown grid, grouped by AIG Zone. Showing aggregated line-item totals for the selected bi-monthly period.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// This Month vs Last Month — dynamic latest-with-data detection.
// ---------------------------------------------------------------------------

function MonthVsMonth() {
  const [data, setData] = useState<{
    thisM: number; lastM: number; thisY: number; lastY: number;
    thisIn: number; lastIn: number; thisEx: number; lastEx: number;
    thisC: number; lastC: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const [fiData, apiAies] = await Promise.all([
        listFundInflows({ status: "APPROVED" }),
        listAies(),
      ]);
      const inflows = fiData.map(r => ({ amount: Number(r.amount), inflow_date: r.inflowDate }));
      const aies = apiAies.map(a => ({ id: a.id, amount: Number(a.totalAmount || 0), issue_date: a.issueDate }));
      const lineByAie: Record<string, number> = {};
      apiAies.forEach(a => {
        if (a.lineItems.length > 0) {
          lineByAie[a.id] = a.lineItems.reduce((s, l) => s + Number(l.amount), 0);
        }
      });
      const aieAmount = (a: { id: string; amount: number }) =>
        lineByAie[a.id] != null ? lineByAie[a.id] : a.amount;

      // Latest (year, month) that has any data across inflows, AIE or
      // distributions. Distributions are attributed to the FIRST month of
      // their bi-monthly period (see expenditureTotals.sumDistributionsForMonth).
      const keys = new Set<string>();
      inflows.forEach(r => { const d = new Date(r.inflow_date); if (!isNaN(d.getTime())) keys.add(`${d.getFullYear()}-${d.getMonth()}`); });
      aies.forEach(r => { const d = new Date(r.issue_date); if (!isNaN(d.getTime())) keys.add(`${d.getFullYear()}-${d.getMonth()}`); });
      // Distribution periods contribute their first-month bucket.
      const periods = loadDistributionPeriods();
      const distYear = 2026;
      periods.forEach(p => {
        const firstCol = (p?.columns?.[0] || "").toLowerCase();
        const idx = MONTH_FULL.findIndex(m => m.toLowerCase() === firstCol);
        if (idx >= 0) keys.add(`${distYear}-${idx}`);
      });
      if (!keys.size) { setData(null); return; }
      const sorted = [...keys].map(k => k.split("-").map(Number) as [number, number])
        .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const [thisY, thisM] = sorted[sorted.length - 1];
      const lastM = (thisM + 11) % 12;
      const lastY = thisM === 0 ? thisY - 1 : thisY;

      let thisIn = 0, lastIn = 0, thisEx = 0, lastEx = 0, thisC = 0, lastC = 0;
      inflows.forEach(r => {
        const d = new Date(r.inflow_date);
        if (d.getFullYear() === thisY && d.getMonth() === thisM) thisIn += Number(r.amount || 0);
        else if (d.getFullYear() === lastY && d.getMonth() === lastM) lastIn += Number(r.amount || 0);
      });
      aies.forEach(a => {
        const d = new Date(a.issue_date);
        if (isNaN(d.getTime())) return;
        const amt = aieAmount(a);
        if (d.getFullYear() === thisY && d.getMonth() === thisM) { thisEx += amt; thisC++; }
        else if (d.getFullYear() === lastY && d.getMonth() === lastM) { lastEx += amt; lastC++; }
      });
      // Distribution attributable to each compared month.
      thisEx += sumDistributionsForMonth(thisM, periods);
      lastEx += sumDistributionsForMonth(lastM, periods);
      setData({ thisM, lastM, thisY, lastY, thisIn, lastIn, thisEx, lastEx, thisC, lastC });
    })();
  }, []);

  if (!data) {
    return <p className="text-[12px] text-muted-foreground italic">No data yet. Add inflow or expenditure records to see the comparison.</p>;
  }
  const pct = (a: number, b: number) => b === 0 ? "—" : `${((a - b) / b * 100).toFixed(1)}%`;
  const chart = [
    { label: "Inflows", This: data.thisIn, Last: data.lastIn },
    { label: "Expenditures", This: data.thisEx, Last: data.lastEx },
  ];
  return (
    <div className="space-y-4">
      <p className="text-[12px] text-muted-foreground">
        Comparing <span className="font-semibold text-foreground">{MONTH_FULL[data.thisM]} {data.thisY}</span> vs{" "}
        <span className="font-semibold text-foreground">{MONTH_FULL[data.lastM]} {data.lastY}</span>.
        The latest month with data is detected automatically; new months will roll the comparison forward.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
        <Tile label="This month inflows" value={formatNaira(data.thisIn)} delta={pct(data.thisIn, data.lastIn)} />
        <Tile label="Last month inflows" value={formatNaira(data.lastIn)} />
        <Tile label="This month expenditures" value={formatNaira(data.thisEx)} delta={pct(data.thisEx, data.lastEx)} />
        <Tile label="Last month expenditures" value={formatNaira(data.lastEx)} />
      </div>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNaira(Number(v))} width={80} />
            <Tooltip formatter={(v: any) => formatNaira(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="This" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Last" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted-foreground">AIE record count: this month {data.thisC} · last month {data.lastC}. Expenditures shown above include AIE plus any distribution attributed to that month (each bi-monthly distribution is counted in its first month only).</p>
    </div>
  );
}

export default function ComparisonsPage() {
  useEffect(() => { document.title = "Comparisons – NPF BMS"; }, []);
  return (
    <div className="space-y-4 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold font-serif">Comparative Views</h1>
        <p className="text-[12px] text-muted-foreground">Side-by-side comparisons across zones and periods.</p>
      </div>
      <Tabs defaultValue="zone">
        <TabsList>
          <TabsTrigger value="zone">Zone vs Zone</TabsTrigger>
          <TabsTrigger value="month">This Month vs Last</TabsTrigger>
          <TabsTrigger value="variance">Budget vs Actual (AIE)</TabsTrigger>
        </TabsList>
        <TabsContent value="zone"><ZoneVsZone /></TabsContent>
        <TabsContent value="month"><MonthVsMonth /></TabsContent>
        <TabsContent value="variance"><VarianceReportPage /></TabsContent>
      </Tabs>
    </div>
  );
}
