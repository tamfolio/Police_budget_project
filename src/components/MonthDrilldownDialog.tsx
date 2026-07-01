import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MONTHS, formatNaira } from "@/data/constants";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { listFundInflows } from "@/lib/fundInflowsApi";
import { listExpenditures } from "@/lib/expendituresApi";

type Inflow = { id: string; inflow_date: string; reference_no: string; source: string; amount: number; status: string };
type Exp = { id: string; expense_date: string; voucher_no: string; payee: string; gross_amount: number; status: string; sub_item_code: string };

export function MonthDrilldownDialog({
  open, onOpenChange, fy, monthIndex,
}: { open: boolean; onOpenChange: (b: boolean) => void; fy: number | "ALL"; monthIndex: number | null }) {
  const [inflows, setInflows] = useState<Inflow[]>([]);
  const [exps, setExps] = useState<Exp[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || monthIndex == null) return;
    (async () => {
      setLoading(true);
      const fyNum = fy === "ALL" ? undefined : fy;
      const [fiData, expData] = await Promise.all([
        listFundInflows(fyNum != null ? { fiscalYear: fyNum } : {}),
        listExpenditures(fyNum != null ? { fiscalYear: fyNum } : {}),
      ]);
      const inMonth = (d: string) => new Date(d).getMonth() === monthIndex;
      setInflows(
        fiData
          .filter(r => inMonth(r.inflowDate))
          .map(r => ({
            id: r.id,
            inflow_date: r.inflowDate,
            reference_no: r.referenceNo ?? "",
            source: r.source,
            amount: Number(r.amount),
            status: r.status,
          }))
      );
      setExps(
        expData
          .filter(r => inMonth(r.expenseDate))
          .map(r => ({
            id: r.id,
            expense_date: r.expenseDate,
            voucher_no: r.voucherNo,
            payee: r.payee,
            gross_amount: Number(r.grossAmount),
            status: r.status,
            sub_item_code: r.subItemCode,
          }))
      );
      setLoading(false);
    })();
  }, [open, monthIndex, fy]);

  const totalIn = inflows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalEx = exps.reduce((s, r) => s + Number(r.gross_amount || 0), 0);
  const monthName = monthIndex != null ? MONTHS[monthIndex] : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {monthName} {fy === "ALL" ? "(All FY)" : `FY ${fy}`} — Transactions
          </DialogTitle>
          <DialogDescription>
            {loading ? "Loading…" : `${inflows.length} inflows · ${exps.length} expenditures`}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto pr-1 space-y-6 flex-1">
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold font-serif">Fund Inflows · {formatNaira(totalIn)}</h3>
              <Link to="/fund-inflows" className="text-[11px] text-primary inline-flex items-center gap-1 hover:underline">
                Open page <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {inflows.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No inflows in {monthName}.</p>
            ) : (
              <table className="w-full text-[12px]">
                <thead className="text-[10px] uppercase text-muted-foreground bg-muted/30">
                  <tr><th className="text-left p-1.5">Date</th><th className="text-left p-1.5">Ref</th><th className="text-left p-1.5">Source</th><th className="text-right p-1.5">Amount</th><th className="text-left p-1.5">Status</th></tr>
                </thead>
                <tbody>
                  {inflows.map(r => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="p-1.5">{r.inflow_date}</td>
                      <td className="p-1.5 font-medium">{r.reference_no}</td>
                      <td className="p-1.5">{r.source}</td>
                      <td className="p-1.5 text-right tabular-nums">{formatNaira(Number(r.amount))}</td>
                      <td className="p-1.5"><span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold font-serif">Expenditures · {formatNaira(totalEx)}</h3>
              <Link to="/expenditures" className="text-[11px] text-primary inline-flex items-center gap-1 hover:underline">
                Open page <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {exps.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No expenditures in {monthName}.</p>
            ) : (
              <table className="w-full text-[12px]">
                <thead className="text-[10px] uppercase text-muted-foreground bg-muted/30">
                  <tr><th className="text-left p-1.5">Date</th><th className="text-left p-1.5">Voucher</th><th className="text-left p-1.5">Payee</th><th className="text-left p-1.5">Sub-item</th><th className="text-right p-1.5">Gross</th><th className="text-left p-1.5">Status</th></tr>
                </thead>
                <tbody>
                  {exps.map(r => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="p-1.5">{r.expense_date}</td>
                      <td className="p-1.5 font-medium">{r.voucher_no}</td>
                      <td className="p-1.5">{r.payee}</td>
                      <td className="p-1.5">{r.sub_item_code}</td>
                      <td className="p-1.5 text-right tabular-nums">{formatNaira(Number(r.gross_amount))}</td>
                      <td className="p-1.5"><span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
