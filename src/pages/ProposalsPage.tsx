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
  Check, Loader2, Pencil, Plus, RefreshCcw, Send, Trash2, X, FileText, XCircle,
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
import { listDepartments, type Department } from "@/lib/departmentsApi";
import { getBudgetCodeReference, type BudgetSubItem } from "@/lib/budgetCodesApi";
import ProposalFormDialog from "@/components/proposals/ProposalFormDialog";

const fmtN = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
const fmtDt = (iso?: string) => {
  try { return iso ? new Date(iso).toLocaleDateString() : "—"; } catch { return iso ?? "—"; }
};

const STATUS_VARIANT: Record<BudgetProposalStatus, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  PENDING_REVIEW: "secondary",
  PENDING_APPROVAL: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
};

const STEP_LABEL: Record<BudgetProposalStatus, string> = {
  DRAFT:            "Step 1/3 · Draft",
  SUBMITTED:        "Step 2/3 · Awaiting officer review",
  PENDING_REVIEW:   "Step 2/3 · Awaiting officer review",
  PENDING_APPROVAL: "Step 3/3 · Awaiting director approval",
  APPROVED:         "Complete",
  REJECTED:         "Rejected",
};

function StepPill({ status }: { status: BudgetProposalStatus }) {
  const colour =
    status === "APPROVED" ? "text-emerald-700 dark:text-emerald-400" :
    status === "REJECTED" ? "text-destructive" :
    "text-muted-foreground";
  return <span className={`text-[10px] ${colour}`}>{STEP_LABEL[status]}</span>;
}

function apiErrorMessage(e: unknown, fallback: string) {
  if (e instanceof ApiError) return e.message || fallback;
  if (e instanceof Error) return e.message;
  return fallback;
}

// Shared reference data hook — fetches departments + sub-items once
function useRefData() {
  const [depts, setDepts] = useState<Department[]>([]);
  const [subItems, setSubItems] = useState<BudgetSubItem[]>([]);

  useEffect(() => {
    Promise.all([listDepartments({ isActive: true }), getBudgetCodeReference()])
      .then(([d, ref]) => {
        setDepts(d);
        setSubItems(ref.categories.flatMap(c => (c.subItems ?? [])));
      })
      .catch(() => {});
  }, []);

  const deptMap = useMemo(() => Object.fromEntries(depts.map(d => [d.id, d.name])), [depts]);
  const subMap = useMemo(() => Object.fromEntries(subItems.map(s => [s.code, s])), [subItems]);

  return { deptMap, subMap };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ProposalsPage() {
  useEffect(() => { document.title = "Budget Proposals – NPF BMS"; }, []);
  const [tab, setTab] = useState<"all" | "queue">("all");

  return (
    <div className="space-y-4 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold font-serif flex items-center gap-2">
          <FileText className="h-5 w-5" /> Budget Proposals
        </h1>
        <p className="text-[12px] text-muted-foreground mt-1">
          Clerk drafts a proposal → Senior Budget Officer reviews → Senior Budget Director approves.
        </p>
      </div>

      {/* Workflow legend */}
      <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground rounded-lg border border-border bg-muted/20 px-4 py-3">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/40 inline-block" />Step 1 — <b className="text-foreground">Budget Clerk</b> drafts &amp; submits</span>
        <span className="text-muted-foreground/40">→</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-400 inline-block" />Step 2 — <b className="text-foreground">Sr. Budget Officer</b> reviews</span>
        <span className="text-muted-foreground/40">→</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />Step 3 — <b className="text-foreground">Sr. Budget Director</b> approves</span>
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

// ─────────────────────────────────────────────────────────────────────────────
// All proposals
// ─────────────────────────────────────────────────────────────────────────────
function ProposalsListTab() {
  const { hasRole } = useAuth();
  const isClk = hasRole("BUDGET_CLK") || hasRole("SYSADMIN");
  const isOff = hasRole("BUDGET_OFF") || hasRole("SYSADMIN");
  const isDir = hasRole("BUDGET_DIR") || hasRole("SYSADMIN");

  const { deptMap, subMap } = useRefData();

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
      (deptMap[r.departmentId] ?? r.departmentId).toLowerCase().includes(q) ||
      (subMap[r.subItemId]?.name ?? r.subItemId).toLowerCase().includes(q) ||
      r.subItemId.toLowerCase().includes(q) ||
      (r.description ?? "").toLowerCase().includes(q),
    );
  }, [rows, search, deptMap, subMap]);

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
    if (!confirm(`Delete this draft proposal?`)) return;
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
      toast.success(kind === "submit" ? "Submitted for review." : kind === "review" ? "Reviewed — sent to director." : "Approved.");
      await refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e, `${kind} failed.`));
    }
  };

  const handleReject = async () => {
    if (!rejectRow) return;
    if (rejectReason.trim().length < 5) { toast.error("Reason must be at least 5 characters."); return; }
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
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-[11px]">Fiscal year</Label>
            <Input className="h-8 w-24 text-[12px]" type="number" min={2000} max={2100}
              value={fyFilter} onChange={(e) => setFyFilter(e.target.value)} />
          </div>
          <div>
            <Label className="text-[11px]">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-48 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {PROPOSAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <Label className="text-[11px]">Search</Label>
            <Input className="h-8 text-[12px]" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Department, sub-item, description…" />
          </div>
          <Button size="sm" variant="ghost" type="button" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
          </Button>
          {isClk && (
            <Button size="sm" type="button" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New proposal
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded border border-border overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Department</th>
                <th className="text-left px-3 py-2">Sub-item</th>
                <th className="text-left px-3 py-2">FY</th>
                <th className="text-right px-3 py-2">Amount (₦)</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Stage</th>
                <th className="text-left px-3 py-2">Updated</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No proposals match the filters.</td></tr>
              ) : filtered.map(r => {
                const deptName = deptMap[r.departmentId] ?? r.departmentId.slice(0, 8) + "…";
                const sub = subMap[r.subItemId];
                const subLabel = sub ? `${sub.code} — ${sub.name}` : r.subItemId.slice(0, 12) + "…";
                return (
                  <tr key={r.id} className="border-t border-border/60 hover:bg-muted/20">
                    <td className="px-3 py-2">{deptName}</td>
                    <td className="px-3 py-2 max-w-[180px]">
                      <span className="font-mono text-[11px]">{sub?.code ?? r.subItemId.slice(0, 8)}</span>
                      {sub && <span className="text-muted-foreground ml-1 text-[11px]">— {sub.name}</span>}
                    </td>
                    <td className="px-3 py-2">{r.fiscalYear}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{fmtN(r.amount)}</td>
                    <td className="px-3 py-2">
                      <Badge variant={STATUS_VARIANT[r.status]} className="text-[10px]">{r.status.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <StepPill status={r.status} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{fmtDt(r.updatedAt ?? r.createdAt)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {/* Clerk actions on DRAFT */}
                      {r.status === "DRAFT" && isClk && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit draft" onClick={() => openEdit(r)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Submit for officer review" onClick={() => doWorkflow(r, "submit")}>
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" title="Delete draft" onClick={() => handleDelete(r)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {/* Officer review */}
                      {(r.status === "SUBMITTED" || r.status === "PENDING_REVIEW") && isOff && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:text-blue-600" title="Mark reviewed — pass to director" onClick={() => doWorkflow(r, "review")}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" title="Reject"
                            onClick={() => { setRejectRow(r); setRejectReason(""); }}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {/* Director approve */}
                      {r.status === "PENDING_APPROVAL" && isDir && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-600" title="Approve" onClick={() => doWorkflow(r, "approve")}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" title="Reject"
                            onClick={() => { setRejectRow(r); setRejectReason(""); }}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
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

      {/* Reject dialog */}
      <Dialog open={!!rejectRow} onOpenChange={(o) => { if (!o) { setRejectRow(null); setRejectReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject proposal</DialogTitle>
            <DialogDescription className="text-[12px]">
              Provide a clear reason. The proposal will be marked REJECTED and the submitter notified.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-[11px]">Reason <span className="text-muted-foreground">(min 5 characters)</span></Label>
            <Textarea rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              maxLength={1000} className="text-[12px] mt-0.5"
              placeholder="Explain why this proposal is being rejected." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setRejectRow(null); setRejectReason(""); }} disabled={rejecting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleReject} disabled={rejecting}>
              {rejecting ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Rejecting…</> : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// My Queue — role-aware actionable items
// ─────────────────────────────────────────────────────────────────────────────
function MyQueueTab() {
  const { hasRole } = useAuth();
  const isOff = hasRole("BUDGET_OFF") || hasRole("SYSADMIN");
  const isDir = hasRole("BUDGET_DIR") || hasRole("SYSADMIN");
  const isClk = hasRole("BUDGET_CLK") || hasRole("SYSADMIN");

  const { deptMap, subMap } = useRefData();

  const currentYear = new Date().getFullYear();
  const [fyFilter, setFyFilter] = useState<string>(String(currentYear));
  const [rows, setRows] = useState<BudgetProposal[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<BudgetProposal | null>(null);

  const [rejectRow, setRejectRow] = useState<BudgetProposal | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const queueStatus: BudgetProposalStatus | null =
    isDir ? "PENDING_APPROVAL" :
    isOff ? "PENDING_REVIEW" :
    isClk ? "DRAFT" :
    null;

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
      toast.success(
        queueStatus === "PENDING_APPROVAL" ? "Approved." :
        queueStatus === "PENDING_REVIEW" ? "Reviewed — sent to director." :
        "Submitted for officer review."
      );
      await refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Action failed."));
    }
  };

  const handleReject = async () => {
    if (!rejectRow) return;
    if (rejectReason.trim().length < 5) { toast.error("Reason must be at least 5 characters."); return; }
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

  const handleFormSubmit = async (payload: CreateBudgetProposalPayload | UpdateBudgetProposalPayload) => {
    if (!formInitial) return;
    try {
      await updateBudgetProposal(formInitial.id, payload);
      toast.success("Proposal updated.");
      setFormOpen(false);
      setFormInitial(null);
      await refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Save failed."));
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

  const actionLabel =
    queueStatus === "DRAFT" ? "Submit for review" :
    queueStatus === "PENDING_REVIEW" ? "Mark reviewed" :
    "Approve";

  const queueDescription =
    queueStatus === "DRAFT" ? "Your draft proposals — edit then submit when ready." :
    queueStatus === "PENDING_REVIEW" ? "Proposals awaiting your officer review before going to the director." :
    "Proposals awaiting your final approval.";

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-end gap-2">
          <div>
            <Label className="text-[11px]">Fiscal year</Label>
            <Input className="h-8 w-24 text-[12px]" type="number" min={2000} max={2100}
              value={fyFilter} onChange={(e) => setFyFilter(e.target.value)} />
          </div>
          <p className="text-[11px] text-muted-foreground self-center ml-1">{queueDescription}</p>
          <Button size="sm" variant="ghost" type="button" className="ml-auto" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
          </Button>
        </div>

        <div className="rounded border border-border overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Department</th>
                <th className="text-left px-3 py-2">Sub-item</th>
                <th className="text-left px-3 py-2">FY</th>
                <th className="text-right px-3 py-2">Amount (₦)</th>
                <th className="text-left px-3 py-2">Stage</th>
                <th className="text-left px-3 py-2">Updated</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Nothing in your queue.</td></tr>
              ) : rows.map(r => {
                const deptName = deptMap[r.departmentId] ?? r.departmentId.slice(0, 8) + "…";
                const sub = subMap[r.subItemId];
                return (
                  <tr key={r.id} className="border-t border-border/60 hover:bg-muted/20">
                    <td className="px-3 py-2">{deptName}</td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-[11px]">{sub?.code ?? r.subItemId.slice(0, 8)}</span>
                      {sub && <span className="text-muted-foreground ml-1 text-[11px]">— {sub.name}</span>}
                    </td>
                    <td className="px-3 py-2">{r.fiscalYear}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{fmtN(r.amount)}</td>
                    <td className="px-3 py-2 whitespace-nowrap"><StepPill status={r.status} /></td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{fmtDt(r.updatedAt ?? r.createdAt)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap flex justify-end gap-1">
                      {/* Clerk: edit + submit */}
                      {queueStatus === "DRAFT" && (
                        <>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" type="button"
                            onClick={() => { setFormInitial(r); setFormOpen(true); }}>
                            <Pencil className="h-3 w-3 mr-1" />Edit
                          </Button>
                          <Button size="sm" className="h-7 px-2 text-[11px]" type="button" onClick={() => doAction(r)}>
                            <Send className="h-3 w-3 mr-1" />{actionLabel}
                          </Button>
                        </>
                      )}
                      {/* Officer: review + reject */}
                      {queueStatus === "PENDING_REVIEW" && (
                        <>
                          <Button size="sm" className="h-7 px-2 text-[11px]" type="button" onClick={() => doAction(r)}>
                            <Check className="h-3 w-3 mr-1" />{actionLabel}
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] text-destructive border-destructive/40 hover:bg-destructive/10" type="button"
                            onClick={() => { setRejectRow(r); setRejectReason(""); }}>
                            <XCircle className="h-3 w-3 mr-1" />Reject
                          </Button>
                        </>
                      )}
                      {/* Director: approve + reject */}
                      {queueStatus === "PENDING_APPROVAL" && (
                        <>
                          <Button size="sm" className="h-7 px-2 text-[11px]" type="button" onClick={() => doAction(r)}>
                            <Check className="h-3 w-3 mr-1" />{actionLabel}
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] text-destructive border-destructive/40 hover:bg-destructive/10" type="button"
                            onClick={() => { setRejectRow(r); setRejectReason(""); }}>
                            <XCircle className="h-3 w-3 mr-1" />Reject
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Edit dialog for clerk queue */}
      <ProposalFormDialog
        open={formOpen}
        mode="edit"
        initial={formInitial}
        onSubmit={handleFormSubmit}
        onClose={() => { setFormOpen(false); setFormInitial(null); }}
      />

      {/* Reject dialog */}
      <Dialog open={!!rejectRow} onOpenChange={(o) => { if (!o) { setRejectRow(null); setRejectReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject proposal</DialogTitle>
            <DialogDescription className="text-[12px]">Provide a clear reason. The proposal will be marked REJECTED.</DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-[11px]">Reason <span className="text-muted-foreground">(min 5 characters)</span></Label>
            <Textarea rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              maxLength={1000} className="text-[12px] mt-0.5" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setRejectRow(null); setRejectReason(""); }} disabled={rejecting}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleReject} disabled={rejecting}>
              {rejecting ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Rejecting…</> : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
