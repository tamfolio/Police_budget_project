import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useFocusRow } from "@/hooks/useFocusRow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, Unlock, Archive } from "lucide-react";
import {
  getBudgetCodeReference,
  updateFiscalYearStatus,
  type BudgetCategory,
  type FiscalYear,
} from "@/lib/budgetCodesApi";

type Sub = { code: string; name: string; categoryCode: string; sort: number };

export default function BudgetReferencePage() {
  const { hasRole } = useAuth();
  const isSys = hasRole("SYSADMIN");
  const [cats, setCats] = useState<BudgetCategory[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [fys, setFys] = useState<FiscalYear[]>([]);
  useFocusRow([cats.length, subs.length, loading]);

  useEffect(() => {
    (async () => {
      try {
        const ref = await getBudgetCodeReference();
        setCats(ref.categories);
        const flat: Sub[] = ref.categories.flatMap(c =>
          (c.subItems ?? []).map(s => ({ code: s.code, name: s.name, categoryCode: s.categoryCode, sort: s.sort }))
        );
        setSubs(flat);
        setFys([...ref.fiscalYears].sort((a, b) => b.year - a.year));
      } catch {
        toast.error("Failed to load budget reference data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleFy = async (fy: FiscalYear) => {
    const next = fy.status === "CLOSED" ? "OPEN" : "CLOSED";
    if (!confirm(`${next === "CLOSED" ? "Close" : "Reopen"} fiscal year ${fy.year}? ${next === "CLOSED" ? "All transactions for this year will become read-only." : "Transactions will become editable again."}`)) return;
    try {
      const updated = await updateFiscalYearStatus(fy.year, next);
      setFys(s => s.map(x => x.year === fy.year ? { ...x, status: updated.status } : x));
      toast.success(`FY ${fy.year} ${next === "CLOSED" ? "closed (archived)" : "reopened"}.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update fiscal year status.");
    }
  };

  const term = q.trim().toLowerCase();
  const match = (s: Sub) =>
    !term || s.code.toLowerCase().includes(term) || s.name.toLowerCase().includes(term);

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <header>
        <h1 className="text-2xl font-serif font-bold text-foreground">Budget Category & Sub-Item Reference</h1>
        <p className="text-sm text-muted-foreground mt-1">
          NPF/GIFMIS chart of accounts — {cats.length} parent categories, {subs.length} sub-item codes.
          Source: NPF BMS User Stories §10.2.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-card">
        <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 bg-[#F7F8FA]">
          <Archive className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold font-serif">Fiscal year retention & archive</h2>
          {!isSys && <span className="ml-auto text-[10.5px] text-muted-foreground italic">Read-only — SYSADMIN required to change.</span>}
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#FAFBFC] border-b border-border text-[10.5px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2 w-10">S/N</th>
              <th className="px-4 py-2">Year</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Appropriation (₦)</th>
              <th className="px-4 py-2 text-right">Revised (₦)</th>
              <th className="px-4 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {fys.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-3 text-[12px] italic text-muted-foreground">No fiscal years configured.</td></tr>
            )}
            {fys.map((fy, i) => (
              <tr key={fy.year} className="border-b border-border last:border-0">
                <td className="px-4 py-1.5 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                <td className="px-4 py-1.5 font-mono text-[12px]">{fy.year}</td>
                <td className="px-4 py-1.5">
                  <Badge variant={fy.status === "CLOSED" ? "destructive" : "default"} className="text-[10px]">
                    {fy.status === "CLOSED" ? "CLOSED (archived)" : "OPEN"}
                  </Badge>
                </td>
                <td className="px-4 py-1.5 text-right text-[12px] tabular-nums">{Number(fy.appropriationActAmount).toLocaleString()}</td>
                <td className="px-4 py-1.5 text-right text-[12px] tabular-nums">{Number(fy.revisedAmount).toLocaleString()}</td>
                <td className="px-4 py-1.5 text-right">
                  {isSys && (
                    <Button size="sm" variant={fy.status === "CLOSED" ? "outline" : "destructive"} className="h-7 text-[11px]" onClick={() => toggleFy(fy)}>
                      {fy.status === "CLOSED" ? <><Unlock className="h-3 w-3 mr-1" />Reopen</> : <><Lock className="h-3 w-3 mr-1" />Close FY</>}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-4 py-2 text-[10.5px] text-muted-foreground border-t border-border">
          Closing a fiscal year freezes all transactions (AIE, fund inflows, expenditures, distributions, carry-overs, proposals) for that year. The data remains readable for audit and reporting; further edits require a sysadmin to reopen the year.
        </p>
      </section>

      <Input
        placeholder="Search by code or name…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-md"
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-6">
          {cats.map((cat) => {
            const rows = subs.filter((s) => s.categoryCode === cat.code && match(s));
            if (term && rows.length === 0) return null;
            return (
              <section key={cat.code} data-focus-id={cat.code} className="rounded-lg border border-border overflow-hidden">
                <div className="bg-primary text-primary-foreground px-4 py-2.5 flex items-baseline gap-3">
                  <span className="font-mono text-[12px] text-accent">{cat.code}</span>
                  <span className="font-serif text-[14px] font-semibold">{cat.name}</span>
                  <span className="ml-auto text-[11px] opacity-70">{rows.length} sub-items</span>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#F7F8FA] border-b border-border">
                      <th className="px-4 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground w-10">S/N</th>
                      <th className="px-4 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground w-32">Code</th>
                      <th className="px-4 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s, i) => (
                      <tr key={s.code} data-focus-id={s.code} className={i % 2 === 0 ? "bg-card" : "bg-[#FAFBFC]"}>
                        <td className="px-4 py-1.5 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                        <td className="px-4 py-1.5 font-mono text-[12px] text-foreground">{s.code}</td>
                        <td className="px-4 py-1.5 text-[13px]">{s.name}</td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-3 text-[12px] italic text-muted-foreground">No sub-items.</td></tr>
                    )}
                  </tbody>
                </table>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
