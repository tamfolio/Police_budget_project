import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Check, History, Loader2, Pencil, Plus, RefreshCcw, Send, Trash2, Undo2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/apiClient";
import {
  approveExpenditure, createExpenditure, deleteExpenditure,
  getExpenditureAuditTrail, listExpenditures, returnExpenditure,
  reviewExpenditure, submitExpenditure, updateExpenditure,
  TRANSACTION_STATUSES,
  type ExpenditureAuditEntry, type ExpenditureRecord, type TransactionStatus,
  type CreateExpenditurePayload, type UpdateExpenditurePayload,
} from "@/lib/expendituresApi";
import ExpenditureFormDialog from "./ExpenditureFormDialog";

const fmtN = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const STATUS_VARIANT: Record<TransactionStatus, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  OFFICER_REVIEWED: "secondary",
  APPROVED: "default",
  RETURNED: "destructive",
  CANCELLED: "destructive",
};

function apiErrorMessage(e: unknown, fallback: string) {
  if (e instanceof ApiError) return e.message || fallback;
  if (e instanceof Error) return e.message;
  return fallback;
}

export default function ExpendituresTransactionsTab() {
  const { hasRole } = useAuth();
  const isClk = hasRole("BUDGET_CLK") || hasRole("SYSADMIN");
  const isOff = hasRole("BUDGET_OFF") || hasRole("SYSADMIN");
  const isDir = hasRole("BUDGET_DIR") || hasRole("SYSADMIN");

  const currentYear = new Date().getFullYear();
  const [fyFilter, setFyFilter] = useState<string>(String(currentYear));
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const [rows, setRows] = useState<ExpenditureRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formInitial, setFormInitial] = useState<ExpenditureRecord | null>(null);

  const [trailRow, setTrailRow] = useState<ExpenditureRecord | null>(null);
  const [returnRow, setReturnRow] = useState<ExpenditureRecord | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listExpenditures({
        fiscalYear: fyFilter ? Number(fyFilter) : undefined,
        status: statusFilter !== "ALL" ? (statusFilter as TransactionStatus) : undefined,
      });
      setRows(data);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to load expenditures."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fyFilter, statusFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.voucherNo.toLowerCase().includes(q)
      || r.payee.toLowerCase().includes(q)
      || (r.subItemCode || "").toLowerCase().includes(q)
      || (r.description || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const openCreate = () => { setFormMode("create"); setFormInitial(null); setFormOpen(true); };
  const openEdit = (r: ExpenditureRecord) => { setFormMode("edit"); setFormInitial(r); setFormOpen(true); };

  const handleSubmitForm = async (payload: CreateExpenditurePayload | UpdateExpenditurePayload) => {
    try {
      if (formMode === "create") {
        await createExpenditure(payload as CreateExpenditurePayload);
        toast.success("Draft expenditure created.");
      } else if (formInitial) {
        await updateExpenditure(formInitial.id, payload);
        toast.success("Expenditure updated.");
      }
      setFormOpen(false);
      setFormInitial(null);
      await refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Save failed."));
    }
  };

  const doWorkflow = async (r: ExpenditureRecord, kind: "submit" | "review" | "approve") => {
    try {
      if (kind === "submit") await submitExpenditure(r.id);
      else if (kind === "review") await reviewExpenditure(r.id);
      else await approveExpenditure(r.id);
      toast.success(`Voucher ${kind}d.`);
      await refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e, `${kind} failed.`));
    }
  };

  const doDelete = async (r: ExpenditureRecord) => {
    if (!confirm(`Delete voucher ${r.voucherNo}? This cannot be undone.`)) return;
    try {
      await deleteExpenditure(r.id);
      toast.success("Voucher deleted.");
      await refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Delete failed."));
    }
  };

  const doReturn = async (remarks: string) => {
    if (!returnRow) return;
    try {
      await returnExpenditure(returnRow.id, remarks);
      toast.success("Voucher returned for correction.");
      setReturnRow(null);
      await refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Return failed."));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">Fiscal year</Label>
            <Input type="number" className="h-9 w-[100px] mt-1" value={fyFilter} onChange={e => setFyFilter(e.target.value)} />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[180px] mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {TRANSACTION_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Search</Label>
            <Input className="h-9 w-[240px] mt-1" placeholder="Voucher, payee, code…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
          {isClk && <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />New voucher</Button>}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-separate border-spacing-0">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2">Voucher</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Payee</th>
                  <th className="px-3 py-2">Sub-item</th>
                  <th className="px-3 py-2 text-right">Gross</th>
                  <th className="px-3 py-2 text-right">WHT</th>
                  <th className="px-3 py-2 text-right">Net</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">No vouchers match.</td></tr>
                )}
                {filtered.map(r => {
                  const canEdit = isClk && (r.status === "DRAFT" || r.status === "RETURNED");
                  const canSubmit = isClk && (r.status === "DRAFT" || r.status === "RETURNED");
                  const canReview = isOff && r.status === "SUBMITTED";
                  const canApprove = isDir && r.status === "OFFICER_REVIEWED";
                  const canReturn = (isOff || isDir) && (r.status === "SUBMITTED" || r.status === "OFFICER_REVIEWED");
                  const canDelete = isClk && r.status === "DRAFT";
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-1.5 font-medium">{r.voucherNo}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap">{r.expenseDate}</td>
                      <td className="px-3 py-1.5">{r.payee}</td>
                      <td className="px-3 py-1.5 font-mono text-[11.5px]">
                        {r.subItemCode}
                        {r.subItem?.name && <span className="text-muted-foreground"> — {r.subItem.name}</span>}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmtN(r.grossAmount)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmtN(r.whtAmount)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{fmtN(r.netAmount)}</td>
                      <td className="px-3 py-1.5"><Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge></td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">
                        <div className="inline-flex flex-wrap gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => setTrailRow(r)} title="Audit trail"><History className="h-3.5 w-3.5" /></Button>
                          {canEdit && <Button size="sm" variant="ghost" onClick={() => openEdit(r)} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>}
                          {canSubmit && <Button size="sm" variant="outline" onClick={() => doWorkflow(r, "submit")} title="Submit"><Send className="h-3.5 w-3.5" /></Button>}
                          {canReview && <Button size="sm" variant="outline" onClick={() => doWorkflow(r, "review")} title="Review"><Check className="h-3.5 w-3.5" /></Button>}
                          {canApprove && <Button size="sm" onClick={() => doWorkflow(r, "approve")} title="Approve"><Check className="h-3.5 w-3.5" /></Button>}
                          {canReturn && <Button size="sm" variant="outline" onClick={() => setReturnRow(r)} title="Return"><Undo2 className="h-3.5 w-3.5" /></Button>}
                          {canDelete && <Button size="sm" variant="destructive" onClick={() => doDelete(r)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ExpenditureFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setFormInitial(null); }}
        mode={formMode}
        initial={formInitial}
        onSubmit={handleSubmitForm}
      />

      {trailRow && <AuditDialog row={trailRow} onClose={() => setTrailRow(null)} />}
      {returnRow && <ReturnDialog row={returnRow} onClose={() => setReturnRow(null)} onConfirm={doReturn} />}
    </div>
  );
}

function AuditDialog({ row, onClose }: { row: ExpenditureRecord; onClose: () => void }) {
  const [entries, setEntries] = useState<ExpenditureAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getExpenditureAuditTrail(row.id)
      .then(e => { if (!cancelled) setEntries(e); })
      .catch(e => { if (!cancelled) toast.error(apiErrorMessage(e, "Failed to load audit trail.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [row.id]);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Audit trail — {row.voucherNo}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && entries.length === 0 && <p className="text-sm text-muted-foreground">No actions recorded.</p>}
          {!loading && entries.length > 0 && (
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40 text-left">
                <tr><th className="px-3 py-1.5">When</th><th className="px-3 py-1.5">Action</th><th className="px-3 py-1.5">Actor</th><th className="px-3 py-1.5">Remarks</th></tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-1.5 whitespace-nowrap">{e.createdAt ? new Date(e.createdAt).toLocaleString() : "—"}</td>
                    <td className="px-3 py-1.5 font-medium">{e.action}</td>
                    <td className="px-3 py-1.5">{e.actorName || e.actor || "—"}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{e.remarks ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
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
        <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} maxLength={1000} rows={5} />
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