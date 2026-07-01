import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Check, Loader2, RefreshCcw, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/apiClient";
import {
  approveExpenditure, listExpenditures, returnExpenditure,
  reviewExpenditure, submitExpenditure,
  type ExpenditureRecord, type TransactionStatus,
} from "@/lib/expendituresApi";

const fmtN = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

function apiErrorMessage(e: unknown, fb: string) {
  if (e instanceof ApiError) return e.message || fb;
  if (e instanceof Error) return e.message;
  return fb;
}

function queuesForUser(opts: { isClk: boolean; isOff: boolean; isDir: boolean }) {
  const qs: { label: string; status: TransactionStatus; action: "submit" | "review" | "approve" }[] = [];
  if (opts.isDir) qs.push({ label: "Awaiting your approval", status: "OFFICER_REVIEWED", action: "approve" });
  if (opts.isOff) qs.push({ label: "Awaiting your review", status: "SUBMITTED", action: "review" });
  if (opts.isClk) qs.push({ label: "Returned to you for correction", status: "RETURNED", action: "submit" });
  return qs;
}

export default function ExpendituresQueueTab() {
  const { hasRole } = useAuth();
  const isClk = hasRole("BUDGET_CLK") || hasRole("SYSADMIN");
  const isOff = hasRole("BUDGET_OFF") || hasRole("SYSADMIN");
  const isDir = hasRole("BUDGET_DIR") || hasRole("SYSADMIN");

  const queues = useMemo(() => queuesForUser({ isClk, isOff, isDir }), [isClk, isOff, isDir]);

  const [byStatus, setByStatus] = useState<Record<string, ExpenditureRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const [returnRow, setReturnRow] = useState<{ row: ExpenditureRecord } | null>(null);

  const refresh = useCallback(async () => {
    if (queues.length === 0) { setByStatus({}); setLoading(false); return; }
    setLoading(true);
    try {
      const entries = await Promise.all(
        queues.map(q => listExpenditures({ status: q.status }).then(rows => [q.status, rows] as const)),
      );
      setByStatus(Object.fromEntries(entries));
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to load queue."));
    } finally {
      setLoading(false);
    }
  }, [queues]);

  useEffect(() => { refresh(); }, [refresh]);

  const act = async (row: ExpenditureRecord, action: "submit" | "review" | "approve") => {
    try {
      if (action === "submit") await submitExpenditure(row.id);
      else if (action === "review") await reviewExpenditure(row.id);
      else await approveExpenditure(row.id);
      toast.success(`Voucher ${action}d.`);
      await refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e, `${action} failed.`));
    }
  };

  const doReturn = async (remarks: string) => {
    if (!returnRow) return;
    try {
      await returnExpenditure(returnRow.row.id, remarks);
      toast.success("Voucher returned.");
      setReturnRow(null);
      await refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Return failed."));
    }
  };

  if (queues.length === 0) {
    return <p className="text-sm text-muted-foreground">Your role has no actionable queue here.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>
          <RefreshCcw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>
      {queues.map(q => {
        const rows = byStatus[q.status] ?? [];
        return (
          <Card key={q.status}>
            <CardContent className="p-0">
              <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                <div className="text-[13px] font-semibold">{q.label}</div>
                <Badge variant="secondary">{rows.length}</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead className="bg-muted/30 text-left">
                    <tr>
                      <th className="px-3 py-1.5">Voucher</th>
                      <th className="px-3 py-1.5">Date</th>
                      <th className="px-3 py-1.5">Payee</th>
                      <th className="px-3 py-1.5">Sub-item</th>
                      <th className="px-3 py-1.5 text-right">Net (₦)</th>
                      <th className="px-3 py-1.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && <tr><td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">Loading…</td></tr>}
                    {!loading && rows.length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">Nothing here. You're caught up.</td></tr>
                    )}
                    {rows.map(r => (
                      <tr key={r.id} className="border-t border-border">
                        <td className="px-3 py-1.5 font-medium">{r.voucherNo}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap">{r.expenseDate}</td>
                        <td className="px-3 py-1.5">{r.payee}</td>
                        <td className="px-3 py-1.5 font-mono text-[11.5px]">{r.subItemCode}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{fmtN(r.netAmount)}</td>
                        <td className="px-3 py-1.5 text-right whitespace-nowrap">
                          <Button size="sm" onClick={() => act(r, q.action)} className="mr-1">
                            <Check className="h-3.5 w-3.5 mr-1" />
                            {q.action === "submit" ? "Resubmit" : q.action === "review" ? "Review" : "Approve"}
                          </Button>
                          {q.action !== "submit" && (
                            <Button size="sm" variant="outline" onClick={() => setReturnRow({ row: r })}>
                              <Undo2 className="h-3.5 w-3.5 mr-1" />Return
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {returnRow && <ReturnDialog row={returnRow.row} onClose={() => setReturnRow(null)} onConfirm={doReturn} />}
    </div>
  );
}

function ReturnDialog({ row, onClose, onConfirm }: { row: ExpenditureRecord; onClose: () => void; onConfirm: (remarks: string) => Promise<void> }) {
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (remarks.trim().length < 3) { toast.error("Remarks must be at least 3 characters."); return; }
    setBusy(true);
    try { await onConfirm(remarks.trim()); } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return voucher {row.voucherNo}</DialogTitle>
          <DialogDescription>Provide remarks (3–1000 chars).</DialogDescription>
        </DialogHeader>
        <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={5} maxLength={1000} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}