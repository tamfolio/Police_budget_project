import { useEffect, useMemo, useState } from "react";
import { getBudgetCodeReference } from "@/lib/budgetCodesApi";
import { getExpenditureRollup, type ExpenditureRollupItem } from "@/lib/expendituresApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  aggregateFormationAndSchoolsByCode,
  subscribeDistribution,
  useDistributionBreakdown,
  isTotalRow,
  zoneAmountColumnCount,
  loadZonesPeriods, loadFormationPeriods, loadSchoolPeriods,
} from "@/lib/distributionAggregation";
import {
  type Period, type ZoneGroupKey,
} from "@/data/distributionBreakdown";
import { toFullCode } from "@/lib/budgetCodes";

const GROUP_KEYS: ZoneGroupKey[] = ["zone1_6", "zone7_12", "zone13_17"];

const fmtN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(Number(n) || 0);
const fmtPlain = (n: number) =>
  new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

type SubItem = { code: string; name: string; category_code: string };
type Category = { code: string; name: string };

export default function ExpendituresOverviewTab() {
  const navigate = useNavigate();
  const [periods, setPeriods] = useState<Period[]>(loadZonesPeriods);
  const [formationPeriods, setFormationPeriods] = useState(loadFormationPeriods);
  const [schoolPeriods, setSchoolPeriods] = useState(loadSchoolPeriods);
  const distBreakdown = useDistributionBreakdown();
  const [subs, setSubs] = useState<SubItem[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [rollup, setRollup] = useState<ExpenditureRollupItem[]>([]);
  const [aieSummaryTotal, setAieSummaryTotal] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    return subscribeDistribution(() => {
      setPeriods(loadZonesPeriods());
      setFormationPeriods(loadFormationPeriods());
      setSchoolPeriods(loadSchoolPeriods());
    });
  }, []);

  useEffect(() => {
    (async () => {
      const [ref, rollupData] = await Promise.all([
        getBudgetCodeReference(),
        getExpenditureRollup().catch(() => ({ items: [] as ExpenditureRollupItem[], aieSummary: 0 })),
      ]);
      setSubs(ref.categories.flatMap(cat =>
        (cat.subItems ?? []).map(s => ({
          code: s.code,
          name: s.name,
          category_code: cat.code,
        }))
      ));
      setCats(ref.categories.map(cat => ({ code: cat.code, name: cat.name })));
      setRollup(rollupData.items);
      setAieSummaryTotal(rollupData.aieSummary);
    })();
  }, []);

  const subByCode = useMemo(() => Object.fromEntries(subs.map(s => [s.code, s])), [subs]);
  const catByCode = useMemo(() => Object.fromEntries(cats.map(c => [c.code, c])), [cats]);

  // Aggregate Zones distribution amounts across all periods, by sub-item code
  const distBySubItem = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of periods) {
      const amountColumns = zoneAmountColumnCount(p);
      for (const gk of GROUP_KEYS) {
        for (const f of (p.data[gk] || [])) {
          for (const it of f.items) {
            if (isTotalRow(it)) continue;
            const sum = (it.amounts || []).slice(0, amountColumns).reduce((s, a) => s + (Number(a) || 0), 0);
            if (!sum) continue;
            const code = toFullCode(it.code);
            if (!code) continue;
            m[code] = (m[code] || 0) + sum;
          }
        }
      }
    }
    const fs = aggregateFormationAndSchoolsByCode();
    for (const [k, v] of Object.entries(fs)) m[k] = (m[k] || 0) + v;
    return m;
  }, [periods, formationPeriods, schoolPeriods]);

  // Distribution amounts from the API rollup field
  const distFromApi = useMemo(() => {
    const m: Record<string, number> = {};
    rollup.forEach(r => {
      const amt = Number(r.distributionAmount || 0);
      if (amt) m[r.code] = (m[r.code] || 0) + amt;
    });
    return m;
  }, [rollup]);

  // AIE spent amounts from the API rollup field
  const aieBySubItem = useMemo(() => {
    const m: Record<string, number> = {};
    rollup.forEach(r => {
      const amt = Number(r.aieAmount || 0);
      if (amt) m[r.code] = (m[r.code] || 0) + amt;
    });
    return m;
  }, [rollup]);

  const rollupByCode = useMemo(
    () => Object.fromEntries(rollup.map(r => [r.code, r])),
    [rollup],
  );

  const combinedRows = useMemo(() => {
    const codes = new Set<string>([
      ...Object.keys(distBySubItem),
      ...Object.keys(distFromApi),
      ...Object.keys(aieBySubItem),
    ]);
    const rows = Array.from(codes).map(code => {
      const api = rollupByCode[code];
      const sub = subByCode[code];
      const cat = sub ? catByCode[sub.category_code] : undefined;
      const dist = distBySubItem[code] || distFromApi[code] || 0;
      const aie = aieBySubItem[code] || 0;
      return {
        code,
        name: api?.item || sub?.name || "—",
        category: api?.category || cat?.name || sub?.category_code || "—",
        aie,
        dist,
        total: aie + dist,
      };
    });
    rows.sort((a, b) => b.total - a.total);
    const q = search.trim().toLowerCase();
    return q
      ? rows.filter(r => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
      : rows;
  }, [distBySubItem, distFromApi, aieBySubItem, rollupByCode, subByCode, catByCode, search]);

  const totals = useMemo(() => combinedRows.reduce(
    (t, r) => { t.aie += r.aie; t.dist += r.dist; t.total += r.total; return t; },
    { aie: 0, dist: 0, total: 0 },
  ), [combinedRows]);

  const kpiDist = distBreakdown.total;
  const kpiAie = aieSummaryTotal;
  const kpiTotal = kpiDist + kpiAie;
  const goToSummary = () => navigate("/distributions?tab=summary");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-[11px] text-muted-foreground">Search code / name / category</Label>
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="e.g. 0301, Stationery" className="h-9 w-[280px] mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile
          label="Distribution Expenditure"
          value={fmtN(kpiDist)}
          onClick={goToSummary}
          actionLabel="View distribution summary"
          sub={`Zones ${fmtN(distBreakdown.zones)} · Form ${fmtN(distBreakdown.formation)} · Sch ${fmtN(distBreakdown.schools)}`}
        />
        <StatTile
          label="AIE Expenditure"
          value={fmtN(kpiAie)}
          onClick={() => navigate("/aie")}
          actionLabel="View AIE records"
        />
        <StatTile label="Total Expenditure" value={fmtN(kpiTotal)} emphasize sub="AIE + Distribution" />
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Aggregate by budget sub-item</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2 w-10">S/N</th>
                  <th className="px-3 py-2 w-24">Code</th>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2 text-right w-36">Distributions (₦)</th>
                  <th className="px-3 py-2 text-right w-36">AIE Spent (₦)</th>
                  <th className="px-3 py-2 text-right w-36">Total (₦)</th>
                </tr>
              </thead>
              <tbody>
                {combinedRows.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No expenditure data yet.</td></tr>
                )}
                {combinedRows.map((r, i) => (
                  <tr key={r.code} className="border-t border-border">
                    <td className="px-3 py-1.5 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-3 py-1.5 font-mono">{r.code}</td>
                    <td className="px-3 py-1.5">{r.name}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{r.category}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtPlain(r.dist)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtPlain(r.aie)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{fmtPlain(r.total)}</td>
                  </tr>
                ))}
                {combinedRows.length > 0 && (
                  <tr className="border-t border-border bg-muted/40 font-semibold">
                    <td className="px-3 py-1.5" colSpan={4}>Total</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtPlain(totals.dist)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtPlain(totals.aie)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtPlain(totals.total)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  label, value, emphasize, onClick, actionLabel, sub,
}: { label: string; value: string; emphasize?: boolean; onClick?: () => void; actionLabel?: string; sub?: string }) {
  const clickable = !!onClick;
  return (
    <Card
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } } : undefined}
      className={[
        emphasize ? "border-primary/40" : "",
        clickable ? "cursor-pointer transition-colors hover:bg-accent/40 hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : "",
      ].join(" ").trim()}
    >
      <CardContent className="p-4">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`mt-1 tabular-nums ${emphasize ? "text-xl font-semibold" : "text-lg font-medium"}`}>{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-1">{sub}</div>}
        {clickable && (
          <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
            {actionLabel ?? "View breakdown"} <ArrowRight className="h-3 w-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
