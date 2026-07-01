import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Trash2,
  Undo2,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError } from "@/lib/apiClient";
import {
  approveFundInflow,
  createFundInflow,
  deleteFundInflow,
  FUND_INFLOW_SOURCES,
  FUND_INFLOW_STATUSES,
  type FundInflow,
  type FundInflowSource,
  type FundInflowStatus,
  getFiscalYearTotals,
  listFundInflows,
  rejectFundInflow,
  reopenFundInflow,
  reviewFundInflow,
  submitFundInflow,
  updateFundInflow,
} from "@/lib/fundInflowsApi";

type Tab = "ALL" | "MINE" | "REVIEW" | "APPROVAL";

interface EditorState {
  open: boolean;
  mode: "create" | "edit";
  id?: string;
  fiscalYear: number;
  inflowDate: string;
  source: FundInflowSource;
  referenceNo: string;
  amount: string;
  notes: string;
  saving: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);
const currentYear = new Date().getFullYear();

const EMPTY_EDITOR: EditorState = {
  open: false,
  mode: "create",
  fiscalYear: currentYear,
  inflowDate: today(),
  source: "FAAC_ALLOCATION",
  referenceNo: "",
  amount: "",
  notes: "",
  saving: false,
};

const STATUS_VARIANT: Record<FundInflowStatus, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  PENDING_REVIEW: "secondary",
  PENDING_APPROVAL: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
};

const fmtNGN = (n: number | string) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(Number(n) || 0);

export default function FundInflowsPage() {
  const [tab, setTab] = useState<Tab>("ALL");
  const [rows, setRows] = useState<FundInflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [fyFilter, setFyFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");

  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);
  const [rejecting, setRejecting] = useState<FundInflow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSaving, setRejectSaving] = useState(false);

  const [fyTotalsYear, setFyTotalsYear] = useState<number>(currentYear);
  const [fyTotal, setFyTotal] = useState<number | null>(null);

  useEffect(() => {
    document.title = "Fund Inflows – NPF BMS";
  }, []);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof listFundInflows>[0] = {};
      if (fyFilter !== "ALL") params.fiscalYear = Number(fyFilter);
      if (statusFilter !== "ALL") params.status = statusFilter as FundInflowStatus;
      if (sourceFilter !== "ALL") params.source = sourceFilter as FundInflowSource;
      const data = await listFundInflows(params);
      setRows(data);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load fund inflows.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchTotals = async (year: number) => {
    try {
      const res = await getFiscalYearTotals(year);
      const total = Number(res?.totalAmount ?? 0);
      setFyTotal(Number.isFinite(total) ? total : 0);
    } catch {
      setFyTotal(null);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fyFilter, statusFilter, sourceFilter]);

  useEffect(() => {
    fetchTotals(fyTotalsYear);
  }, [fyTotalsYear]);

  const fiscalYears = useMemo(() => {
    const set = new Set<number>(rows.map(r => r.fiscalYear));
    [currentYear - 1, currentYear, currentYear + 1].forEach(y => set.add(y));
    return Array.from(set).sort((a, b) => b - a);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (!q) return true;
      return (
        (r.referenceNo ?? "").toLowerCase().includes(q) ||
        (r.notes ?? "").toLowerCase().includes(q) ||
        String(r.amount).includes(q)
      );
    });
  }, [rows, search]);

  const openCreate = () =>
    setEditor({ ...EMPTY_EDITOR, open: true, mode: "create", fiscalYear: currentYear, inflowDate: today() });

  const openEdit = (r: FundInflow) =>
    setEditor({
      open: true,
      mode: "edit",
      id: r.id,
      fiscalYear: r.fiscalYear,
      inflowDate: r.inflowDate?.slice(0, 10) ?? today(),
      source: r.source,
      referenceNo: r.referenceNo ?? "",
      amount: String(r.amount ?? ""),
      notes: r.notes ?? "",
      saving: false,
    });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(editor.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Amount must be a positive number.");
      return;
    }
    if (editor.referenceNo && !/^[A-Z0-9/\-]+$/.test(editor.referenceNo)) {
      toast.error("Reference must use uppercase letters, numbers, '/' or '-'.");
      return;
    }
    setEditor(p => ({ ...p, saving: true }));
    try {
      const payload = {
        fiscalYear: Number(editor.fiscalYear),
        inflowDate: editor.inflowDate,
        source: editor.source,
        referenceNo: editor.referenceNo.trim() || undefined,
        amount: amt,
        notes: editor.notes.trim() || undefined,
      };
      if (editor.mode === "create") {
        await createFundInflow(payload);
        toast.success("Draft fund inflow created.");
      } else if (editor.id) {
        await updateFundInflow(editor.id, payload);
        toast.success("Fund inflow updated.");
      }
      setEditor(EMPTY_EDITOR);
      fetchRows();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to save.";
      toast.error(msg);
      setEditor(p => ({ ...p, saving: false }));
    }
  };

  const wrap = async (label: string, fn: () => Promise<unknown>, onOk?: () => void) => {
    try {
      await fn();
      toast.success(label);
      onOk?.();
      fetchRows();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : `${label} failed.`;
      toast.error(msg);
    }
  };

  const remove = (r: FundInflow) => {
    if (!confirm(`Delete draft ${r.referenceNo || r.id.slice(0, 8)}?`)) return;
    wrap("Draft deleted.", () => deleteFundInflow(r.id));
  };

  const submitReject = async () => {
    if (!rejecting) return;
    const reason = rejectReason.trim();
    if (reason.length < 5) {
      toast.error("Rejection reason must be at least 5 characters.");
      return;
    }
    setRejectSaving(true);
    try {
      await rejectFundInflow(rejecting.id, reason);
      toast.success("Fund inflow rejected.");
      setRejecting(null);
      setRejectReason("");
      fetchRows();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Reject failed.";
      toast.error(msg);
    } finally {
      setRejectSaving(false);
    }
  };

  // The tab is purely a UI hint here: the server enforces the actual queue
  // contents through /queue/review and /queue/approval. To keep this page
  // self-contained we map tabs to status filters on the main list.
  useEffect(() => {
    if (tab === "REVIEW") setStatusFilter("PENDING_REVIEW");
    else if (tab === "APPROVAL") setStatusFilter("PENDING_APPROVAL");
    else if (tab === "MINE" || tab === "ALL") {
      // Leave the status filter intact when switching to ALL/MINE so the
      // user can still drill in by status manually.
    }
  }, [tab]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold font-serif flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Fund Inflows
          </h1>
          <p className="text-[12px] text-muted-foreground">
            Record incoming funds and walk them through review and approval.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={fetchRows} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New inflow
          </Button>
        </div>
      </div>

      {/* FY totals */}
      <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-[12px] text-muted-foreground">FY totals</Label>
          <Select value={String(fyTotalsYear)} onValueChange={(v) => setFyTotalsYear(Number(v))}>
            <SelectTrigger className="h-8 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fiscalYears.map(y => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-lg font-semibold font-serif">
          {fyTotal === null ? <span className="text-muted-foreground text-sm">—</span> : fmtNGN(fyTotal)}
        </div>
        <span className="text-[11px] text-muted-foreground">approved inflows</span>
      </div>

      {/* Tabs + filters */}
      <div className="space-y-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="REVIEW">Officer review</TabsTrigger>
            <TabsTrigger value="APPROVAL">Director approval</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search reference, notes…"
              className="pl-8 h-9 w-64"
            />
          </div>
          <Select value={fyFilter} onValueChange={setFyFilter}>
            <SelectTrigger className="h-9 w-32">
              <SelectValue placeholder="Fiscal year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All years</SelectItem>
              {fiscalYears.map(y => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {FUND_INFLOW_STATUSES.map(s => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All sources</SelectItem>
              {FUND_INFLOW_SOURCES.map(s => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[90px_110px_140px_1fr_140px_110px_220px] gap-3 px-4 py-2 border-b border-border bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div>FY</div>
          <div>Date</div>
          <div>Source</div>
          <div>Reference / Notes</div>
          <div className="text-right">Amount</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>
        {loading ? (
          <div className="px-4 py-10 text-center text-[12px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-[12px] text-muted-foreground">No fund inflows found.</div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map(r => (
              <li
                key={r.id}
                className="grid grid-cols-[90px_110px_140px_1fr_140px_110px_220px] gap-3 px-4 py-2.5 text-[12.5px] items-center"
              >
                <div className="font-mono">{r.fiscalYear}</div>
                <div>{r.inflowDate?.slice(0, 10)}</div>
                <div>
                  <Badge variant="outline" className="font-mono text-[10.5px]">{r.source}</Badge>
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{r.referenceNo || "—"}</div>
                  {r.notes && <div className="text-[11.5px] text-muted-foreground truncate">{r.notes}</div>}
                </div>
                <div className="text-right font-semibold">{fmtNGN(r.amount)}</div>
                <div>
                  <Badge variant={STATUS_VARIANT[r.status]} className="text-[10.5px]">{r.status}</Badge>
                </div>
                <div className="flex justify-end gap-1 flex-wrap">
                  {r.status === "DRAFT" && (
                    <>
                      <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(r)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        title="Submit for review"
                        onClick={() => wrap("Submitted for review.", () => submitFundInflow(r.id))}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        title="Delete draft"
                        onClick={() => remove(r)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  {r.status === "PENDING_REVIEW" && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        title="Officer review"
                        onClick={() => wrap("Reviewed.", () => reviewFundInflow(r.id))}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        title="Reject"
                        onClick={() => { setRejecting(r); setRejectReason(""); }}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  {r.status === "PENDING_APPROVAL" && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        title="Approve"
                        onClick={() => wrap("Approved.", () => approveFundInflow(r.id))}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        title="Reject"
                        onClick={() => { setRejecting(r); setRejectReason(""); }}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  {r.status === "REJECTED" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      title="Reopen"
                      onClick={() => wrap("Reopened.", () => reopenFundInflow(r.id))}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {r.status === "APPROVED" && (
                    <span className="text-[11px] text-muted-foreground italic px-2">approved</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Editor dialog */}
      <Dialog open={editor.open} onOpenChange={(o) => { if (!o) setEditor(EMPTY_EDITOR); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editor.mode === "create" ? "New fund inflow" : "Edit fund inflow"}</DialogTitle>
            <DialogDescription>
              Record an incoming fund. Drafts can be edited and deleted; submitted records move into the review queue.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="fi-fy">Fiscal year</Label>
                <Input
                  id="fi-fy"
                  type="number"
                  min={2000}
                  max={2100}
                  value={editor.fiscalYear}
                  onChange={e => setEditor(p => ({ ...p, fiscalYear: Number(e.target.value) }))}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fi-date">Inflow date</Label>
                <Input
                  id="fi-date"
                  type="date"
                  value={editor.inflowDate}
                  onChange={e => setEditor(p => ({ ...p, inflowDate: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="fi-source">Source</Label>
                <Select
                  value={editor.source}
                  onValueChange={(v) => setEditor(p => ({ ...p, source: v as FundInflowSource }))}
                >
                  <SelectTrigger id="fi-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUND_INFLOW_SOURCES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fi-amount">Amount (NGN)</Label>
                <Input
                  id="fi-amount"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={editor.amount}
                  onChange={e => setEditor(p => ({ ...p, amount: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fi-ref">Reference no. <span className="text-muted-foreground font-normal">(uppercase letters, digits, / or -)</span></Label>
              <Input
                id="fi-ref"
                value={editor.referenceNo}
                onChange={e => setEditor(p => ({ ...p, referenceNo: e.target.value.toUpperCase() }))}
                placeholder="e.g. GR-2026-001"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fi-notes">Notes</Label>
              <Textarea
                id="fi-notes"
                rows={3}
                value={editor.notes}
                onChange={e => setEditor(p => ({ ...p, notes: e.target.value }))}
                placeholder="Optional context for reviewers."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditor(EMPTY_EDITOR)} disabled={editor.saving}>
                <X className="h-3.5 w-3.5 mr-1" />Cancel
              </Button>
              <Button type="submit" disabled={editor.saving}>
                {editor.saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                {editor.mode === "create" ? "Create draft" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejecting} onOpenChange={(o) => { if (!o) { setRejecting(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject fund inflow</DialogTitle>
            <DialogDescription>
              Provide a clear reason — the submitter will see it and may reopen the record after addressing it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="rej-reason">Reason</Label>
            <Textarea
              id="rej-reason"
              rows={4}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              minLength={5}
              maxLength={1000}
              placeholder="Explain why this inflow is being rejected (min 5 characters)."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => { setRejecting(null); setRejectReason(""); }} disabled={rejectSaving}>
              <Undo2 className="h-3.5 w-3.5 mr-1" />Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={submitReject} disabled={rejectSaving}>
              {rejectSaving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}