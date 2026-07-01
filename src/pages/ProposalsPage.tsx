import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Check, Loader2, Pencil, Plus, RefreshCcw, Send, Trash2, X, FileText,
} from "lucide-react";
import { ApiError } from "@/lib/apiClient";
import {
  approveBudgetProposal, createBudgetProposal, deleteBudgetProposal,
  listBudgetProposals, rejectBudgetProposal, reviewBudgetProposal,
  submitBudgetProposal, updateBudgetProposal,
  PROPOSAL_STATUSES,
  type BudgetProposal, type BudgetProposalStatus,
  type CreateBudgetProposalPayload, type UpdateBudgetProposalPayload,
} from "@/lib/budgetProposalsApi";
import ProposalFormDialog from "@/components/proposals/ProposalFormDialog";

const fmtN = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
const fmtDt = (iso?: string) => { try { return iso ? new Date(iso).toLocaleString() : "—"; } catch { return iso ?? "—"; } };

const STATUS_VARIANT: Record<BudgetProposalStatus, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  PENDING_REVIEW: "secondary",
  PENDING_APPROVAL: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
};

function apiErrorMessage(e: unknown, fallback: string) {
  if (e instanceof ApiError) return e.message || fallback;
  if (e instanceof Error) return e.message;
  return fallback;
}

export default function ProposalsPage() {
  useEffect(() => { document.title = "Budget Proposals – NPF BMS"; }, []);
  const [tab, setTab] = useState<"all" | "queue">("all");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold font-serif flex items-center gap-2">
          <FileText className="h-5 w-5" /> Budget Proposals
        </h1>
        <p className="text-[12px] text-muted-foreground mt-1">
          Draft proposals, submit them for review, and follow the approval workflow.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "queue")}>
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="all">All Proposals</TabsTrigger>
          <TabsTrigger value="queue">My Queue</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4"><ProposalsListTab /></TabsContent>
        <TabsContent value="queue" className="mt-4"><MyQueueTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// All proposals — filters, CRUD, full workflow
// ============================================================
function ProposalsListTab() {
  const { hasRole } = useAuth();
  const isClk = hasRole("BUDGET_CLK") || hasRole("SYSADMIN");
  const isOff = hasRole("BUDGET_OFF") || hasRole("SYSADMIN");
  const isDir = hasRole("BUDGET_DIR") || hasRole("SYSADMIN");

  const currentYear = new Date().getFullYear();
  const [fyFilter, setFyFilter] = useState<string>(String(currentYear));
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const [rows, setRows] = useState<BudgetProposal[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formInitial, setFormInitial] = useState<BudgetProposal | null>(null);

  const [rejectRow, setRejectRow] = useState<BudgetProposal | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listBudgetProposals({
        fiscalYear: fyFilter ? Number(fyFilter) : undefined,
        status: statusFilter !== "ALL" ? (statusFilter as BudgetProposalStatus) : undefined,
      });
      setRows(data);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to load proposals."));
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
      r.id.toLowerCase().includes(q)
      || r.departmentId.toLowerCase().includes(q)
      || r.subItemId.toLowerCase().includes(q)
      || (r.description ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const openCreate = () => { setFormMode("create"); setFormInitial(null); setFormOpen(true); };
  const openEdit = (r: BudgetProposal) => { setFormMode("edit"); setFormInitial(r); setFormOpen(true); };

  const handleFormSubmit = async (payload: CreateBudgetProposalPayload | UpdateBudgetProposalPayload) => {
    try {
      if (formMode === "create") {
        await createBudgetProposal(payload as CreateBudgetProposalPayload);
        toast.success("Draft proposal created.");
      } else if (formInitial) {
        await updateBudgetProposal(formInitial.id, payload);
        toast.success("Proposal updated.");
      }
      setFormOpen(false);
      setFormInitial(null);
      await refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Save failed."));
    }
  };

  const handleDelete = async (r: BudgetProposal) => {
    if (!confirm(`Delete draft proposal ${r.id.slice(0, 8)}…?`)) return;
    try {
      await deleteBudgetProposal(r.id);
      toast.success("Draft deleted.");
      await refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Delete failed."));
    }
  };

  const doWorkflow = async (r: BudgetProposal, kind: "submit" | "review" | "approve") => {
    try {
      if (kind === "submit") await submitBudgetProposal(r.id);
      else if (kind === "review") await reviewBudgetProposal(r.id);
      else await approveBudgetProposal(r.id);
      toast.success(`Proposal ${kind === "submit" ? "submitted" : kind === "review" ? "reviewed" : "approved"}.`);
      await refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e, `${kind} failed.`));
    }
  };

  const handleReject = async () => {
    if (!rejectRow) return;
    if (rejectReason.trim().length < 5) {
      toast.error("Reason must be at least 5 characters.");
      return;
    }
    setRejecting(true);
    try {
      await rejectBudgetProposal(rejectRow.id, rejectReason.trim());
      toast.success("Proposal rejected.");
      setRejectRow(null);
      setRejectReason("");
      await refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Reject failed."));
    } finally {
      setRejecting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-[11px]">Fiscal year</Label>
            <Input className="h-8 w-24 text-[12px]" type="number" min={2000} max={2100}
              value={fyFilter} onChange={(e) => setFyFilter(e.target.value)} />
          </div>
          <div>
            <Label className="text-[11px]">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-44 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {PROPOSAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <Label className="text-[11px]">Search</Label>
            <Input className="h-8 text-[12px]" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="ID, department, sub-item, description…" />
          </div>
          <Button size="sm" variant="ghost" type="button" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
          </Button>
          {isClk && (
            <Button size="sm" type="button" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> New
            </Button>
          )}
        </div>

        <div className="rounded border border-border overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-2 py-1.5">ID</th>
                <th className="text-left px-2 py-1.5">FY</th>
                <th className="text-left px-2 py-1.5">Department</th>
                <th className="text-left px-2 py-1.5">Sub-item</th>
                <th className="text-right px-2 py-1.5">Amount</th>
                <th className="text-left px-2 py-1.5">Status</th>
                <th className="text-left px-2 py-1.5">Updated</th>
                <th className="px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-2 py-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-2 py-6 text-center text-muted-foreground">No proposals match the filters.</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="border-t border-border/60 hover:bg-muted/30">
                  <td className="px-2 py-1.5 font-mono text-[10px]">{r.id.slice(0, 8)}…</td>
                  <td className="px-2 py-1.5">{r.fiscalYear}</td>
                  <td className="px-2 py-1.5 font-mono text-[10px]">{r.departmentId.slice(0, 8)}…</td>
                  <td className="px-2 py-1.5 font-mono text-[10px]">{r.subItemId.slice(0, 8)}…</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmtN(r.amount)}</td>
                  <td className="px-2 py-1.5">
                    <Badge variant={STATUS_VARIANT[r.status]} className="text-[10px]">{r.status.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-muted-foreground">{fmtDt(r.updatedAt ?? r.createdAt)}</td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">
                    {r.status === "DRAFT" && isClk && (
                      <>
                        <Button size="sm" variant="ghost" type="button" title="Edit" onClick={() => openEdit(r)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" type="button" title="Submit" onClick={() => doWorkflow(r, "submit")}>
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" type="button" title="Delete" onClick={() => handleDelete(r)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {(r.status === "SUBMITTED" || r.status === "PENDING_REVIEW") && isOff && (
                      <Button size="sm" variant="ghost" type="button" title="Review" onClick={() => doWorkflow(r, "review")}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {r.status === "PENDING_APPROVAL" && isDir && (
                      <Button size="sm" variant="ghost" type="button" title="Approve" onClick={() => doWorkflow(r, "approve")}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {(r.status !== "APPROVED" && r.status !== "REJECTED" && r.status !== "DRAFT") && (isOff || isDir) && (
                      <Button size="sm" variant="ghost" type="button" title="Reject"
                        onClick={() => { setRejectRow(r); setRejectReason(""); }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>

      <ProposalFormDialog
        open={formOpen}
        mode={formMode}
        initial={formInitial}
        onSubmit={handleFormSubmit}
        onClose={() => { setFormOpen(false); setFormInitial(null); }}
      />

      <Dialog open={!!rejectRow} onOpenChange={(o) => { if (!o) { setRejectRow(null); setRejectReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject proposal</DialogTitle>
            <DialogDescription className="text-[12px]">
              Provide a clear reason. The proposal will move to REJECTED.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-[11px]">Reason (min 5 characters)</Label>
            <Textarea rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              maxLength={1000} className="text-[12px]" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setRejectRow(null); setRejectReason(""); }} disabled={rejecting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleReject} disabled={rejecting}>
              {rejecting ? "Rejecting…" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============================================================
// My Queue — role-aware actionable list
// ============================================================
function MyQueueTab() {
  const { hasRole } = useAuth();
  const isOff = hasRole("BUDGET_OFF") || hasRole("SYSADMIN");
  const isDir = hasRole("BUDGET_DIR") || hasRole("SYSADMIN");
  const isClk = hasRole("BUDGET_CLK") || hasRole("SYSADMIN");

  const currentYear = new Date().getFullYear();
  const [fyFilter, setFyFilter] = useState<string>(String(currentYear));
  const [rows, setRows] = useState<BudgetProposal[]>([]);
  const [loading, setLoading] = useState(true);

  const queueStatus: BudgetProposalStatus | null = isDir
    ? "PENDING_APPROVAL"
    : isOff
      ? "PENDING_REVIEW"
      : isClk
        ? "DRAFT"
        : null;

  const refresh = useCallback(async () => {
    if (!queueStatus) { setRows([]); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await listBudgetProposals({
        fiscalYear: fyFilter ? Number(fyFilter) : undefined,
        status: queueStatus,
      });
      setRows(data);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to load queue."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fyFilter, queueStatus]);

  useEffect(() => { refresh(); }, [refresh]);

  const doAction = async (r: BudgetProposal) => {
    try {
      if (queueStatus === "PENDING_APPROVAL") await approveBudgetProposal(r.id);
      else if (queueStatus === "PENDING_REVIEW") await reviewBudgetProposal(r.id);
      else if (queueStatus === "DRAFT") await submitBudgetProposal(r.id);
      toast.success("Action recorded.");
      await refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Action failed."));
    }
  };

  if (!queueStatus) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-[12.5px] text-muted-foreground">
          Your role has no queue for budget proposals.
        </CardContent>
      </Card>
    );
  }

  const actionLabel = queueStatus === "DRAFT" ? "Submit"
    : queueStatus === "PENDING_REVIEW" ? "Review"
    : "Approve";

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-end gap-2">
          <div>
            <Label className="text-[11px]">Fiscal year</Label>
            <Input className="h-8 w-24 text-[12px]" type="number" min={2000} max={2100}
              value={fyFilter} onChange={(e) => setFyFilter(e.target.value)} />
          </div>
          <div className="text-[11px] text-muted-foreground self-center ml-2">
            Showing <Badge variant="secondary" className="text-[10px]">{queueStatus.replace(/_/g, " ")}</Badge> items for your role.
          </div>
          <Button size="sm" variant="ghost" type="button" className="ml-auto" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
          </Button>
        </div>

        <div className="rounded border border-border overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-2 py-1.5">ID</th>
                <th className="text-left px-2 py-1.5">FY</th>
                <th className="text-left px-2 py-1.5">Department</th>
                <th className="text-left px-2 py-1.5">Sub-item</th>
                <th className="text-right px-2 py-1.5">Amount</th>
                <th className="text-left px-2 py-1.5">Updated</th>
                <th className="px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-2 py-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-2 py-6 text-center text-muted-foreground">Nothing to action.</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="border-t border-border/60 hover:bg-muted/30">
                  <td className="px-2 py-1.5 font-mono text-[10px]">{r.id.slice(0, 8)}…</td>
                  <td className="px-2 py-1.5">{r.fiscalYear}</td>
                  <td className="px-2 py-1.5 font-mono text-[10px]">{r.departmentId.slice(0, 8)}…</td>
                  <td className="px-2 py-1.5 font-mono text-[10px]">{r.subItemId.slice(0, 8)}…</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmtN(r.amount)}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-muted-foreground">{fmtDt(r.updatedAt ?? r.createdAt)}</td>
                  <td className="px-2 py-1.5 text-right">
                    <Button size="sm" type="button" onClick={() => doAction(r)}>
                      <Check className="h-3.5 w-3.5" /> {actionLabel}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}