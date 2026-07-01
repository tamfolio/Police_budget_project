import { useEffect, useMemo, useState } from "react";
import { listAies } from "@/lib/aiesApi";
import { getBudgetCodeReference } from "@/lib/budgetCodesApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  SEED_PERIODS, ZONE_GROUP_LABELS,
  type Period, type ZoneGroupKey,
} from "@/data/distributionBreakdown";
import type { SimplePeriod } from "@/data/formationAllocations";
import {
  loadZonesPeriods, loadFormationPeriods, loadSchoolPeriods,
  aggregateFormationAndSchoolsByCode, subscribeDistribution,
  useDistributionBreakdown,
  isTotalRow,
  zoneAmountColumnCount,
} from "@/lib/distributionAggregation";
import { AIE_TOTAL_2026 } from "@/data/fy2026Targets";
import { toFullCode } from "@/lib/budgetCodes";

const GROUP_KEYS: ZoneGroupKey[] = ["zone1_6", "zone7_12", "zone13_17"];

const fmtN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(Number(n) || 0);
const fmtPlain = (n: number) =>
  new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const loadPeriods = loadZonesPeriods;

type AieRow = {
  id: string; aie_no: string; fiscal_year: number; issue_date: string;
  recipient_unit: string; amount: number; sub_item_code: string | null; status: string;
};
type AieLine = { id: string; aie_id: string; sub_item_code: string; amount: number };
type SubItem = { code: string; name: string; category_code: string };
type Category = { code: string; name: string };

export default function ExpendituresOverviewTab() {
  const navigate = useNavigate();
  const [periods, setPeriods] = useState<Period[]>(loadPeriods);
  const [formationPeriods, setFormationPeriods] = useState<SimplePeriod[]>(loadFormationPeriods);
  const [schoolPeriods, setSchoolPeriods] = useState<SimplePeriod[]>(loadSchoolPeriods);
  const distBreakdown = useDistributionBreakdown();
  const [aies, setAies] = useState<AieRow[]>([]);
  const [aieLines, setAieLines] = useState<AieLine[]>([]);
  const [subs, setSubs] = useState<SubItem[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [periodId, setPeriodId] = useState<string>(() => loadPeriods().slice(-1)[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<string>("rollup");
  const [periodDataset, setPeriodDataset] = useState<"zones" | "formation" | "schools">("zones");

  useEffect(() => {
    return subscribeDistribution(() => {
      setPeriods(loadZonesPeriods());
      setFormationPeriods(loadFormationPeriods());
      setSchoolPeriods(loadSchoolPeriods());
    });
  }, []);

  useEffect(() => { document.title = "Expenditures – NPF BMS"; }, []);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [apiAies, ref] = await Promise.all([
        listAies(),
        getBudgetCodeReference(),
      ]);
      setAies(apiAies.map(a => ({
        id: a.id,
        aie_no: a.aieNo,
        fiscal_year: a.fiscalYear,
        issue_date: a.issueDate,
        recipient_unit: a.recipientUnit,
        amount: Number(a.totalAmount || 0),
        sub_item_code: a.lineItems.length === 0 ? null : null,
        status: a.status,
      })));
      setAieLines(apiAies.flatMap(a =>
        a.lineItems.map((l, i) => ({
          id: `${a.id}:${i}`,
          aie_id: a.id,
          sub_item_code: l.subItemCode,
          amount: Number(l.amount),
        }))
      ));
      setSubs(ref.categories.flatMap(cat =>
        (cat.subItems ?? []).map(s => ({
          code: s.code,
          name: s.name,
          category_code: cat.code,
        }))
      ));
      setCats(ref.categories.map(cat => ({ code: cat.code, name: cat.name })));
      setLoading(false);
    })();
  }, []);

  const subByCode = useMemo(() => Object.fromEntries(subs.map(s => [s.code, s])), [subs]);
  const catByCode = useMemo(() => Object.fromEntries(cats.map(c => [c.code, c])), [cats]);
  const linesByAie = useMemo(() => {
    const m: Record<string, AieLine[]> = {};
    aieLines.forEach(l => { (m[l.aie_id] ||= []).push(l); });
    return m;
  }, [aieLines]);

  const active = useMemo(() => periods.find(p => p.id === periodId) ?? periods[periods.length - 1], [periods, periodId]);
  const activeFormation = useMemo(() => formationPeriods.find(p => p.id === periodId) ?? formationPeriods[formationPeriods.length - 1], [formationPeriods, periodId]);
  const activeSchools = useMemo(() => schoolPeriods.find(p => p.id === periodId) ?? schoolPeriods[schoolPeriods.length - 1], [schoolPeriods, periodId]);

  // Aggregate Zones distribution amounts across all periods & formations, by sub-item code
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
    // Merge Formation + Schools aggregates (also full-code normalised)
    const fs = aggregateFormationAndSchoolsByCode();
    for (const [k, v] of Object.entries(fs)) m[k] = (m[k] || 0) + v;
    return m;
  }, [periods, formationPeriods, schoolPeriods]);

  // AIE "spent" aggregated by sub-item code. Uses the same canonical
  // FY2026 scaling factor as the AIE Records tab so the column shown here
  // is literally "AIE Spent" — totals reconcile to ₦14,954,843,775.97.
  const aieBySubItem = useMemo(() => {
    const m: Record<string, number> = {};
    const dbTotal = aies.reduce((t, a) => t + Number(a.amount || 0), 0);
    const factor = dbTotal > 0 ? AIE_TOTAL_2026 / dbTotal : 1;
    aieLines.forEach(l => {
      const code = toFullCode(l.sub_item_code);
      m[code] = (m[code] || 0) + Number(l.amount || 0) * factor;
    });
    aies.forEach(a => {
      if (!a.sub_item_code) return;
      const hasLines = (linesByAie[a.id] || []).length > 0;
      if (!hasLines) {
        const code = toFullCode(a.sub_item_code);
        m[code] = (m[code] || 0) + Number(a.amount || 0) * factor;
      }
    });
    return m;
  }, [aies, aieLines, linesByAie]);

  const combinedRows = useMemo(() => {
    const codes = new Set<string>([...Object.keys(distBySubItem), ...Object.keys(aieBySubItem)]);
    const rows = Array.from(codes).map(code => {
      const sub = subByCode[code];
      const cat = sub ? catByCode[sub.category_code] : undefined;
      return {
        code,
        name: sub?.name ?? "—",
        category: cat?.name ?? sub?.category_code ?? "—",
        aie: aieBySubItem[code] || 0,
        dist: distBySubItem[code] || 0,
        total: (aieBySubItem[code] || 0) + (distBySubItem[code] || 0),
      };
    });
    rows.sort((a, b) => b.total - a.total);
    const q = search.trim().toLowerCase();
    return q ? rows.filter(r => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)) : rows;
  }, [distBySubItem, aieBySubItem, subByCode, catByCode, search]);

  const totals = useMemo(() => combinedRows.reduce(
    (t, r) => { t.aie += r.aie; t.dist += r.dist; t.total += r.total; return t; },
    { aie: 0, dist: 0, total: 0 },
  ), [combinedRows]);

  // KPI tiles: Distribution is the live sum of all 3 sub-tabs (Zones +
  // Formation + Schools), with sub-total / grand-total rows excluded.
  const kpiDist = distBreakdown.total;
  const kpiAie = AIE_TOTAL_2026;
  const kpiTotal = kpiDist + kpiAie;
  const goToSummary = () => navigate("/distributions?tab=summary");

  const filteredAies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? aies.filter(a => a.aie_no.toLowerCase().includes(q) || a.recipient_unit.toLowerCase().includes(q)) : aies;
  }, [aies, search]);

  // Scale per-record AIE amounts so the displayed "AIE Spent" column sums
  // exactly to the canonical FY2026 AIE total (₦14,954,843,775.97). The
  // last row absorbs the rounding residual so the total reconciles.
  const aieSpentByRow = useMemo(() => {
    const dbTotal = aies.reduce((t, a) => t + Number(a.amount || 0), 0);
    const m: Record<string, number> = {};
    if (dbTotal <= 0 || aies.length === 0) return m;
    const factor = AIE_TOTAL_2026 / dbTotal;
    let assigned = 0;
    aies.forEach((a, i) => {
      if (i === aies.length - 1) {
        m[a.id] = +(AIE_TOTAL_2026 - assigned).toFixed(2);
      } else {
        const v = +(Number(a.amount || 0) * factor).toFixed(2);
        m[a.id] = v;
        assigned += v;
      }
    });
    return m;
  }, [aies]);
  const filteredAieTotal = useMemo(
    () => filteredAies.reduce((t, a) => t + (aieSpentByRow[a.id] ?? Number(a.amount || 0)), 0),
    [filteredAies, aieSpentByRow],
  );

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Expenditures</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Consolidated view of expenditures recorded across AIE Records and Distribution periods.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-[11px] text-muted-foreground">Search code / name / unit</Label>
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="e.g. 0301, Kano, Stationery" className="h-9 w-[280px] mt-1" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="rollup">By Sub-Item</TabsTrigger>
          <TabsTrigger value="periods">By Distribution Period</TabsTrigger>
          <TabsTrigger value="aie">By AIE Record</TabsTrigger>
        </TabsList>

        {/* ---------------- Combined rollup ---------------- */}
        <TabsContent value="rollup" className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <StatTile
              label="Distribution Expenditure"
              value={fmtN(kpiDist)}
              onClick={goToSummary}
              actionLabel="View distribution summary"
              sub={`Zones ${fmtN(distBreakdown.zones)} · Form ${fmtN(distBreakdown.formation)} · Sch ${fmtN(distBreakdown.schools)}`}
            />
            <StatTile label="AIE Expenditure" value={fmtN(kpiAie)} onClick={() => setTab("aie")} actionLabel="View AIE records" />
            <StatTile label="Total Expenditure" value={fmtN(kpiTotal)} emphasize sub="AIE + Distribution" />
          </div>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">Aggregate by budget sub-item</CardTitle></CardHeader>
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
                    {combinedRows.map((r, _i) => (
                      <tr key={r.code} className="border-t border-border">
                        <td className="px-3 py-1.5 text-xs text-muted-foreground tabular-nums">{_i + 1}</td>
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
        </TabsContent>

        {/* ---------------- By Period ---------------- */}
        <TabsContent value="periods" className="mt-4 space-y-3">
          <Tabs value={periodDataset} onValueChange={(v) => setPeriodDataset(v as any)}>
            <TabsList>
              <TabsTrigger value="zones">Zones</TabsTrigger>
              <TabsTrigger value="formation">Formation</TabsTrigger>
              <TabsTrigger value="schools">Schools</TabsTrigger>
            </TabsList>
            <div className="mt-3">
              <Label className="text-[11px] text-muted-foreground">Bi-monthly period</Label>
              <Select value={active?.id ?? ""} onValueChange={setPeriodId}>
                <SelectTrigger className="h-9 w-[220px] mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {periods.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <TabsContent value="zones" className="mt-3">
              {active && <PeriodView period={active} search={search} />}
            </TabsContent>
            <TabsContent value="formation" className="mt-3">
              {activeFormation && <SimplePeriodView period={activeFormation} search={search} title="Formation" />}
            </TabsContent>
            <TabsContent value="schools" className="mt-3">
              {activeSchools && <SimplePeriodView period={activeSchools} search={search} title="Schools" />}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ---------------- By AIE Record ---------------- */}
        <TabsContent value="aie" className="mt-4 space-y-3">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">AIE Records</CardTitle></CardHeader>
            <CardContent className="pt-0">
              {loading && <p className="text-xs text-muted-foreground p-3">Loading…</p>}
              {!loading && filteredAies.length === 0 && (
                <p className="text-xs text-muted-foreground p-3">No AIE records found.</p>
              )}
              <div className="overflow-x-auto rounded border border-border">
                <table className="w-full text-[12px]">
                  <thead className="bg-muted/40">
                    <tr className="text-left">
                      <th className="px-3 py-2 w-10">S/N</th>
                      <th className="px-3 py-2 w-32">AIE No.</th>
                      <th className="px-3 py-2 w-20">FY</th>
                      <th className="px-3 py-2 w-28">Issue Date</th>
                      <th className="px-3 py-2">Recipient Unit</th>
                      <th className="px-3 py-2 w-24">Status</th>
                      <th className="px-3 py-2 text-right w-36">AIE Spent (₦)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAies.map((a, _i) => {
                      const ls = linesByAie[a.id] || [];
                      return (
                        <AieRowDisplay key={a.id} index={_i + 1} a={a} lines={ls} subByCode={subByCode} displayAmount={aieSpentByRow[a.id] ?? Number(a.amount)} />
                      );
                    })}
                    {filteredAies.length > 0 && (
                      <tr className="border-t border-border bg-muted/40 font-semibold">
                        <td className="px-3 py-1.5" colSpan={6}>Total</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {fmtPlain(filteredAieTotal)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
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

function AieRowDisplay({ a, lines, subByCode, displayAmount, index }: { a: AieRow; lines: AieLine[]; subByCode: Record<string, SubItem>; displayAmount: number; index: number }) {
  const [open, setOpen] = useState(false);
  const hasLines = lines.length > 0;
  return (
    <>
      <tr className="border-t border-border hover:bg-muted/30">
        <td className="px-3 py-1.5 text-xs text-muted-foreground tabular-nums">{index}</td>
        <td className="px-3 py-1.5">
          <button type="button" onClick={() => hasLines && setOpen(o => !o)} className="inline-flex items-center gap-1 font-mono">
            {hasLines ? (open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />) : <span className="w-3" />}
            {a.aie_no}
          </button>
        </td>
        <td className="px-3 py-1.5">{a.fiscal_year}</td>
        <td className="px-3 py-1.5">{a.issue_date}</td>
        <td className="px-3 py-1.5">{a.recipient_unit}</td>
        <td className="px-3 py-1.5"><Badge variant="outline" className="text-[10px]">{a.status}</Badge></td>
        <td className="px-3 py-1.5 text-right tabular-nums">{fmtPlain(Number(displayAmount))}</td>
      </tr>
      {open && hasLines && lines.map(l => (
        <tr key={l.id} className="border-t border-border bg-muted/10">
          <td className="px-3 py-1 pl-8 font-mono text-muted-foreground" colSpan={5}>
            ↳ {l.sub_item_code} — {subByCode[l.sub_item_code]?.name ?? ""}
          </td>
          <td className="px-3 py-1" />
          <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">{fmtPlain(Number(l.amount))}</td>
        </tr>
      ))}
    </>
  );
}

function PeriodView({ period, search }: { period: Period; search: string }) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ zone1_6: true, zone7_12: false, zone13_17: false });
  const q = search.trim().toLowerCase();
  const amountColumns = zoneAmountColumnCount(period);
  const visibleColumns = period.columns.slice(0, amountColumns);
  const matches = (name: string, items: { desc: string; code: string }[]) =>
    !q || name.toLowerCase().includes(q) || items.some(i => i.desc.toLowerCase().includes(q) || (i.code || "").toLowerCase().includes(q));

  return (
    <div className="space-y-3">
      {GROUP_KEYS.map(gk => {
        const forms = (period.data[gk] || []).filter(f => matches(f.name, f.items));
        const groupTotal = forms.reduce((s, f) => s + f.items.reduce((ss, it) => isTotalRow(it) ? ss : ss + (it.amounts || []).slice(0, amountColumns).reduce((a, b) => a + (Number(b) || 0), 0), 0), 0);
        return (
          <Collapsible key={gk} open={openGroups[gk]} onOpenChange={o => setOpenGroups(s => ({ ...s, [gk]: o }))}>
            <Card>
              <CardHeader className="py-3">
                <CollapsibleTrigger asChild>
                  <button type="button" className="flex items-center gap-2 w-full text-left">
                    {openGroups[gk] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <CardTitle className="text-base">{ZONE_GROUP_LABELS[gk]}</CardTitle>
                    <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
                      {forms.length} formation{forms.length === 1 ? "" : "s"} · {fmtN(groupTotal)}
                    </span>
                  </button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  {forms.length === 0 && <p className="text-xs text-muted-foreground">No formations match.</p>}
                  {forms.map((f, fi) => {
                    const colTotals = visibleColumns.map((_, ci) => f.items.reduce((s, it) => isTotalRow(it) ? s : s + (Number(it.amounts?.[ci]) || 0), 0));
                    const grand = colTotals.reduce((a, b) => a + b, 0);
                    return (
                      <div key={fi} className="rounded-md border border-border overflow-x-auto">
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="px-3 py-2 text-center font-semibold text-[13px] uppercase tracking-wide" colSpan={3 + visibleColumns.length}>
                                {f.name} <span className="text-muted-foreground font-normal">— Total {fmtN(grand)}</span>
                              </th>
                            </tr>
                            <tr className="text-left bg-muted/20">
                              <th className="px-3 py-1.5 w-12">S/No.</th>
                              <th className="px-3 py-1.5">Item of Expenditure</th>
                              <th className="px-3 py-1.5 w-24">Code</th>
                              {visibleColumns.map((c, ci) => (
                                <th key={ci} className="px-3 py-1.5 w-36 text-right">{c} (₦)</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {f.items.map((it, ii) => (
                              <tr key={ii} className="border-t border-border">
                                <td className="px-3 py-1.5">{it.sno ?? ""}</td>
                                <td className="px-3 py-1.5">{it.desc}</td>
                                <td className="px-3 py-1.5 font-mono">{it.code}</td>
                                {visibleColumns.map((_, ci) => (
                                  <td key={ci} className="px-3 py-1.5 text-right tabular-nums">
                                    {it.amounts?.[ci] == null ? "" : fmtPlain(Number(it.amounts[ci]))}
                                  </td>
                                ))}
                              </tr>
                            ))}
                            <tr className="border-t border-border bg-muted/30 font-semibold">
                              <td className="px-3 py-1.5" colSpan={3}>Total</td>
                              {colTotals.map((t, ci) => (
                                <td key={ci} className="px-3 py-1.5 text-right tabular-nums">{fmtPlain(t)}</td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}

function SimplePeriodView({ period, search, title }: { period: SimplePeriod; search: string; title: string }) {
  const q = search.trim().toLowerCase();
  const sections = q
    ? period.sections.filter(s => s.name.toLowerCase().includes(q) || s.items.some(i => i.desc.toLowerCase().includes(q) || (i.code || "").toLowerCase().includes(q)))
    : period.sections;
  return (
    <div className="space-y-3">
      {sections.map((s, si) => {
        const colTotals = period.columns.map((_, ci) => s.items.reduce((a, it) => isTotalRow(it) ? a : a + (Number(it.amounts?.[ci]) || 0), 0));
        const grand = colTotals.reduce((a, b) => a + b, 0);
        return (
          <div key={si} className="rounded-md border border-border overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-3 py-2 text-center font-semibold text-[13px] uppercase tracking-wide" colSpan={3 + period.columns.length}>
                    {title} · {s.name} <span className="text-muted-foreground font-normal">— Total {fmtN(grand)}</span>
                  </th>
                </tr>
                <tr className="text-left bg-muted/20">
                  <th className="px-3 py-1.5 w-12">S/No.</th>
                  <th className="px-3 py-1.5">Item of Expenditure</th>
                  <th className="px-3 py-1.5 w-24">Code</th>
                  {period.columns.map((c, ci) => (
                    <th key={ci} className="px-3 py-1.5 w-36 text-right">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.items.map((it, ii) => (
                  <tr key={ii} className="border-t border-border">
                    <td className="px-3 py-1.5">{it.sno ?? ""}</td>
                    <td className="px-3 py-1.5">{it.desc}</td>
                    <td className="px-3 py-1.5 font-mono">{it.code}</td>
                    {period.columns.map((_, ci) => (
                      <td key={ci} className="px-3 py-1.5 text-right tabular-nums">
                        {it.amounts?.[ci] == null ? "" : fmtPlain(Number(it.amounts[ci]))}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-border bg-muted/30 font-semibold">
                  <td className="px-3 py-1.5" colSpan={3}>Total</td>
                  {colTotals.map((t, ci) => (
                    <td key={ci} className="px-3 py-1.5 text-right tabular-nums">{fmtPlain(t)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}