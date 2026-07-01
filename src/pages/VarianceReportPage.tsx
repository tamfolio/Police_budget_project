import { Fragment, useEffect, useMemo, useState } from "react";
import { formatNaira, FISCAL_YEARS } from "@/data/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, FileDown } from "lucide-react";
import { AIE_RECEIVED_2026, AIE_SPENT_TOTAL_2026, AIE_BALANCE_2026 } from "@/data/fy2026Targets";
import { getActualByCode, monthlySpentKey } from "@/data/aieMonthlyActuals2026";
import { listAies } from "@/lib/aiesApi";
import { listFundInflows } from "@/lib/fundInflowsApi";
import { getBudgetCodeReference } from "@/lib/budgetCodesApi";

type Sub = { code: string; name: string; category_code: string };
type Cat = { code: string; name: string };
type AieRow = { id: string; aie_no: string; issue_date: string; recipient_unit: string; sub_item_code: string | null; amount: number; status: string; fiscal_year: number };
type AieLine = { id: string; aie_id: string; sub_item_code: string; amount: number };

type AggRow = {
  code: string; name: string; category: string;
  appropriated: number;  // Total column in AIE Records
  actual: number;        // AIE Spent column in AIE Records (distributed)
  variance: number;      // Balance Yet to Distribute (total − distributed)
  pct: number | null;    // actual / appropriated × 100 (null when appropriated = 0)
};

const SPENT_OVERRIDE_KEY = monthlySpentKey;

export default function VarianceReportPage() {
  useEffect(() => { document.title = "Budget vs Actual (AIE) – NPF BMS"; }, []);
  const [fy, setFy] = useState<number>(new Date().getFullYear());
  const [subs, setSubs] = useState<Sub[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [aies, setAies] = useState<AieRow[]>([]);
  const [aieLines, setAieLines] = useState<AieLine[]>([]);
  const [fyTotal, setFyTotal] = useState<number>(0);
  const [janInflow, setJanInflow] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actualByCode, setActualByCode] = useState<Record<string, number>>(() => getActualByCode(new Date().getFullYear()));
  // Keep per-code actuals in sync with edits made on the AIE Records page.
  useEffect(() => {
    const reload = () => setActualByCode(getActualByCode(fy));
    reload();
    const onStorage = (e: StorageEvent) => { if (!e.key || e.key === SPENT_OVERRIDE_KEY(fy)) reload(); };
    window.addEventListener("storage", onStorage);
    const t = window.setInterval(reload, 1500); // pick up same-tab edits
    return () => { window.removeEventListener("storage", onStorage); window.clearInterval(t); };
  }, [fy]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [ref, apiAies, inflowData] = await Promise.all([
        getBudgetCodeReference(),
        listAies({ fiscalYear: fy }),
        listFundInflows({ status: "APPROVED" }),
      ]);
      setCats(ref.categories.map(c => ({ code: c.code, name: c.name })));
      setSubs(ref.categories.flatMap(c => (c.subItems ?? []).map(s => ({ code: s.code, name: s.name, category_code: s.categoryCode }))));
      setAies(apiAies.map(a => ({
        id: a.id,
        aie_no: a.aieNo,
        issue_date: a.issueDate,
        recipient_unit: a.recipientUnit,
        sub_item_code: a.lineItems.length === 1 ? a.lineItems[0].subItemCode : null,
        amount: Number(a.totalAmount || 0),
        status: a.status,
        fiscal_year: a.fiscalYear,
      })));
      setAieLines(apiAies.flatMap(a =>
        a.lineItems.map(l => ({ id: `${a.id}:${l.subItemCode}`, aie_id: a.id, sub_item_code: l.subItemCode, amount: Number(l.amount) }))
      ));
      const fyRow = ref.fiscalYears.find(f => f.year === fy);
      setFyTotal(Number(fyRow?.revisedAmount || fyRow?.appropriationActAmount || 0));
      const janSum = inflowData.reduce((sum, r) => {
        const d = new Date(r.inflowDate);
        if (!isNaN(d.getTime()) && d.getFullYear() === fy && d.getMonth() === 0) {
          return sum + Number(r.amount || 0);
        }
        return sum;
      }, 0);
      setJanInflow(janSum);
      setLoading(false);
    })();
  }, [fy]);

  const rows: AggRow[] = useMemo(() => {
    const catName = new Map(cats.map(c => [c.code, c.name]));
    // Appropriated (Total) = per-code sum of aie_records.amount, the same
    // figure shown in the AIE Records "Total" column.
    const linesByAie: Record<string, AieLine[]> = {};
    aieLines.forEach(l => { (linesByAie[l.aie_id] ||= []).push(l); });
    const apprBy = new Map<string, number>();
    aies.forEach(a => {
      const lines = linesByAie[a.id] || [];
      if (lines.length) {
        lines.forEach(l => { if (l.sub_item_code) apprBy.set(l.sub_item_code, (apprBy.get(l.sub_item_code) ?? 0) + Number(l.amount || 0)); });
      } else if (a.sub_item_code) {
        apprBy.set(a.sub_item_code, (apprBy.get(a.sub_item_code) ?? 0) + Number(a.amount || 0));
      }
    });
    // Actual = Σ monthly actual spend per code from the AIE Records tab
    // (workbook seed + any localStorage overrides). Balance Yet to Distribute
    // (variance) = Budget − Actual, mirroring the AIE Records footer.
    const actBy = new Map<string, number>();
    for (const [c, v] of Object.entries(actualByCode)) actBy.set(c, Number(v) || 0);
    const codes = new Set<string>([...apprBy.keys(), ...actBy.keys()]);
    const out: AggRow[] = [];
    codes.forEach(code => {
      const sub = subs.find(x => x.code === code);
      const appropriated = apprBy.get(code) ?? 0;
      const actual = actBy.get(code) ?? 0;
      out.push({
        code,
        name: sub?.name ?? code,
        category: catName.get(sub?.category_code ?? "") ?? "—",
        appropriated, actual,
        variance: appropriated - actual,
        pct: appropriated > 0 ? (actual / appropriated) * 100 : null,
      });
    });
    out.sort((a, b) => b.appropriated - a.appropriated);
    return out;
  }, [aies, aieLines, subs, cats, actualByCode, fy]);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(r => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
  }, [rows, filter]);

  let totalApprop = rows.reduce((s, r) => s + r.appropriated, 0);
  let totalActual = rows.reduce((s, r) => s + r.actual, 0);
  let totalVariance = totalApprop - totalActual;
  // Anchor the FY2026 footer to the workbook position so Variance mirrors
  // the AIE Records tab exactly (Total Budget − Total Actual = Balance).
  if (fy === 2026) {
    totalApprop = AIE_RECEIVED_2026;
    totalActual = AIE_SPENT_TOTAL_2026;
    totalVariance = AIE_BALANCE_2026;
  }

  const exportCsv = () => {
    const header = ["Sub-item code", "Sub-item name", "Category", "Appropriated (AIE Total)", "Actual (AIE Spent)", "Variance", "% Utilized"];
    const lines = [header.join(","), ...filtered.map(r => [
      r.code, `"${r.name.replace(/"/g, '""')}"`, `"${r.category}"`,
      r.appropriated.toFixed(2), r.actual.toFixed(2), r.variance.toFixed(2),
      r.pct === null ? "N/A" : r.pct.toFixed(1),
    ].join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `variance-fy${fy}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold font-serif">Budget vs Actual (AIE) — Variance</h1>
        <p className="text-[12px] text-muted-foreground">Per sub-item comparison of AIE Total (appropriated) against AIE Spent (actual) from the AIE Records table. Click any row to see the contributing AIE records.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Fiscal Year</Label>
          <Select value={String(fy)} onValueChange={v => setFy(Number(v))}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{FISCAL_YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <Label>Filter</Label>
          <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search by code, name, or category…" />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={exportCsv} className="h-8 text-[12px]">
          <FileDown className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Tile label="FY appropriation ceiling" value={formatNaira(janInflow)} />
        <Tile label="Total appropriated (AIE Total)" value={formatNaira(totalApprop)} />
        <Tile label="Total actual (AIE Spent)" value={formatNaira(totalActual)} />
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-3 py-2 border-b border-border text-[12px] font-semibold">
          {loading ? "Loading…" : `${filtered.length} sub-item(s)`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 w-6"></th>
                <th className="text-left px-3 py-2 w-10">S/N</th>
                <th className="text-left px-3 py-2">Code · Sub-item</th>
                <th className="text-left px-3 py-2 hidden md:table-cell">Category</th>
                <th className="text-right px-3 py-2">Appropriated</th>
                <th className="text-right px-3 py-2">Actual</th>
                <th className="text-right px-3 py-2">Variance</th>
                <th className="text-right px-3 py-2">% Used</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, _i) => {
                const over = r.pct !== null && r.pct > 100;
                const tight = r.pct !== null && r.pct >= 90 && r.pct <= 100;
                const isOpen = expanded === r.code;
                const linesByAie: Record<string, AieLine[]> = {};
                aieLines.forEach(l => { (linesByAie[l.aie_id] ||= []).push(l); });
                const contributing = aies
                  .map(a => {
                    const lines = linesByAie[a.id] || [];
                    let amt = 0;
                    if (lines.length) amt = lines.filter(l => l.sub_item_code === r.code).reduce((s, l) => s + Number(l.amount || 0), 0);
                    else if (a.sub_item_code === r.code) amt = Number(a.amount || 0);
                    return { a, amt };
                  })
                  .filter(x => x.amt > 0)
                  .sort((a, b) => b.a.issue_date.localeCompare(a.a.issue_date));
                return (
                  <Fragment key={r.code}>
                    <tr className="border-t border-border hover:bg-accent/20 cursor-pointer" onClick={() => setExpanded(isOpen ? null : r.code)}>
                      <td className="px-3 py-2 text-muted-foreground">
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">{_i + 1}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{r.code}</div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[280px]">{r.name}</div>
                      </td>
                      <td className="px-3 py-2 hidden md:table-cell text-muted-foreground">{r.category}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatNaira(r.appropriated)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatNaira(r.actual)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${r.variance < 0 ? "text-destructive font-medium" : ""}`}>
                        {formatNaira(r.variance)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Badge variant={over ? "destructive" : tight ? "secondary" : "outline"} className="tabular-nums">
                          {r.pct === null ? "N/A" : `${r.pct.toFixed(1)}%`}
                        </Badge>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-muted/20">
                        <td></td>
                        <td colSpan={7} className="px-3 py-3">
                          <div className="text-[11px] font-semibold mb-2">Contributing AIE records ({contributing.length})</div>
                          {contributing.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground italic">No AIE records for this sub-item.</p>
                          ) : (
                            <table className="w-full text-[11px]">
                              <thead className="text-muted-foreground">
                                <tr>
                                  <th className="text-left py-1 w-8">S/N</th>
                                  <th className="text-left py-1">Issue Date</th>
                                  <th className="text-left py-1">AIE No.</th>
                                  <th className="text-left py-1">Recipient</th>
                                  <th className="text-right py-1">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {contributing.map(({ a, amt }, _ii) => (
                                  <tr key={a.id} className="border-t border-border/50">
                                    <td className="py-1 text-xs text-muted-foreground tabular-nums">{_ii + 1}</td>
                                    <td className="py-1 tabular-nums">{a.issue_date}</td>
                                    <td className="py-1 font-mono">{a.aie_no}</td>
                                    <td className="py-1 truncate max-w-[260px]">{a.recipient_unit}</td>
                                    <td className="py-1 text-right tabular-nums">{formatNaira(amt)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground italic">No data for the selected filter.</td></tr>
              )}
            </tbody>
            {!loading && filtered.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/60 font-bold">
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 hidden md:table-cell"></td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatNaira(totalApprop)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatNaira(totalActual)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${totalVariance < 0 ? "text-destructive" : ""}`}>{formatNaira(totalVariance)}</td>
                  <td className="px-3 py-2 text-right tabular-nums"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base font-bold font-serif tabular-nums mt-1">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}