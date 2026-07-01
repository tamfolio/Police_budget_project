import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/apiClient";
import { getExpenditureRollup, type ExpenditureRollupItem } from "@/lib/expendituresApi";

const fmtN = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

function apiErrorMessage(e: unknown, fb: string) {
  if (e instanceof ApiError) return e.message || fb;
  if (e instanceof Error) return e.message;
  return fb;
}

export default function ExpendituresRollupTab() {
  const [fy, setFy] = useState<string>(String(new Date().getFullYear()));
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ExpenditureRollupItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getExpenditureRollup(fy ? Number(fy) : undefined);
      setRows(data);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to load rollup."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fy]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
  }, [rows, search]);

  const totals = useMemo(
    () => filtered.reduce(
      (s, r) => ({
        gross: s.gross + (Number(r.grossAmount) || 0),
        wht: s.wht + (Number(r.whtAmount) || 0),
        net: s.net + (Number(r.netAmount) || 0),
      }),
      { gross: 0, wht: 0, net: 0 },
    ),
    [filtered],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">Fiscal year</Label>
            <Input type="number" className="h-9 w-[100px] mt-1" value={fy} onChange={e => setFy(e.target.value)} />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Search</Label>
            <Input className="h-9 w-[240px] mt-1" placeholder="Code or name…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>
          <RefreshCcw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-separate border-spacing-0">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 w-36">Sub-item code</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2 text-right">Gross (₦)</th>
                  <th className="px-3 py-2 text-right">WHT (₦)</th>
                  <th className="px-3 py-2 text-right">Net (₦)</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No approved expenditures.</td></tr>
                )}
                {filtered.map(r => (
                  <tr key={r.code} className="border-t border-border">
                    <td className="px-3 py-1.5 font-mono">{r.code}</td>
                    <td className="px-3 py-1.5">{r.name}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtN(r.grossAmount)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtN(r.whtAmount)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{fmtN(r.netAmount)}</td>
                  </tr>
                ))}
                {filtered.length > 0 && (
                  <tr className="border-t border-border bg-muted/40 font-semibold">
                    <td className="px-3 py-1.5" colSpan={2}>Total</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtN(totals.gross)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtN(totals.wht)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtN(totals.net)}</td>
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