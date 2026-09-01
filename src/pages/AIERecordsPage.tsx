import { useEffect, useMemo, useState } from "react";
import { FileSignature, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { listAies } from "@/lib/aiesApi";
import { getBudgetCodeReference } from "@/lib/budgetCodesApi";
import { AieBalancesSummary } from "@/components/AieBalancesSummary";

type AieRow = { id: string; fiscal_year: number; issue_date: string; sub_item_code: string | null; amount: number };
type SubItem = { code: string; name: string };

export default function AIERecordsPage() {
  useEffect(() => { document.title = "AIE Records – NPF BMS"; }, []);

  const [aies, setAies] = useState<AieRow[]>([]);
  const [subs, setSubs] = useState<SubItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const [apiAies, ref] = await Promise.all([listAies(), getBudgetCodeReference()]);
      // Expand each AIE into one row per line item so every row has a real
      // sub_item_code. Without this, multi-line AIEs collapse to null → "—".
      setAies(apiAies.flatMap(a => {
        if (!a.lineItems.length) {
          return [{ id: a.id, fiscal_year: a.fiscalYear, issue_date: a.issueDate, sub_item_code: null, amount: Number(a.totalAmount || 0) }];
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return a.lineItems.map(l => ({
          id: `${a.id}:${l.id ?? l.subItemCodeId}`,
          fiscal_year: a.fiscalYear,
          issue_date: a.issueDate,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sub_item_code: (l as any).subItemCode ?? l.subItemCodeId,
          amount: Number(l.budgetAmount || 0),
        }));
      }));
      setSubs(ref.categories.flatMap(c => (c.subItems ?? []).map(s => ({ code: s.code, name: s.name }))));
    } catch (e: unknown) {
      toast.error((e as Error)?.message || "Failed to load AIE records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const subByCode = useMemo(() => Object.fromEntries(subs.map(s => [s.code, s])), [subs]);
  const availableYears = useMemo(
    () => Array.from(new Set(aies.map(a => a.fiscal_year))).sort((a, b) => a - b),
    [aies],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold font-serif flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            AIE Records
          </h1>
          <p className="text-[12px] text-muted-foreground mt-0.5 max-w-2xl">
            Authority to Incur Expenditure — issue one AIE to a recipient unit with one or more GIFMIS sub-item codes.
            The AIE total is the sum of its line items. Maker-checker: Clerk records, Officer reviews, Director approves.
            90-day expiry tracking included.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />Loading AIE records…
        </div>
      ) : (
        <AieBalancesSummary
          aieRows={aies}
          subByCode={subByCode}
          availableYears={availableYears}
          onChanged={refresh}
        />
      )}
    </div>
  );
}
