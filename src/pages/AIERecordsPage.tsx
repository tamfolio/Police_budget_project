import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Download,
  FileSignature,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Trash2,
  Undo2,
  Upload,
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
  AIE_STATUSES,
  AIE_ITEM_CODES,
  AIE_NO_PATTERN,
  approveAie,
  createAie,
  deleteAie,
  getAieFyTotals,
  listAies,
  rejectAie,
  reopenAie,
  reviewAie,
  submitAie,
  updateAie,
  type Aie,
  type AieItemCode,
  type AieLineItem,
  type AieStatus,
} from "@/lib/aiesApi";
import { parseUpload, UPLOAD_ACCEPT } from "@/lib/tableUpload";
import { getBudgetCodeReference, type BudgetCategory } from "@/lib/budgetCodesApi";
import * as XLSX from "xlsx";

type Tab = "ALL" | "REVIEW" | "APPROVAL";

interface LineDraft {
  itemCode: string;
  subItemCode: string;
  amount: string;
}

interface EditorState {
  open: boolean;
  mode: "create" | "edit";
  id?: string;
  fiscalYear: string;
  aieNo: string;
  issueDate: string;
  expiresOn: string;
  recipientUnit: string;
  lines: LineDraft[];
  saving: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);
const currentYear = new Date().getFullYear();

const EMPTY_LINE: LineDraft = { itemCode: "", subItemCode: "", amount: "" };
const EMPTY_EDITOR: EditorState = {
  open: false,
  mode: "create",
  fiscalYear: String(new Date().getFullYear()),
  aieNo: "",
  issueDate: today(),
  expiresOn: "",
  recipientUnit: "",
  lines: [{ ...EMPTY_LINE }],
  saving: false,
};

const STATUS_VARIANT: Record<AieStatus, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  PENDING_REVIEW: "secondary",
  PENDING_APPROVAL: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
};

const fmtNGN = (n: number | string | undefined) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(Number(n) || 0);

function linesTotal(lines: AieLineItem[] | undefined) {
  return (lines ?? []).reduce((s, l) => s + (Number(l.amount) || 0), 0);
}

// ─── CSV/XLSX columns (one row per line item; rows sharing the same AIE No are merged) ───
const UPLOAD_HEADERS = [
  "AIE No",
  "Fiscal Year",
  "Issue Date",
  "Expires On",
  "Recipient Unit",
  "Item Code",
  "Sub-Item Code",
  "Amount",
];

const SAMPLE_ROWS = [
  ["AIE/2026/01/0001", "2026", "2026-01-15", "", "Finance Department", "OFFICE_SUPPLIES", "STATIONERY", "150000"],
  ["AIE/2026/01/0001", "2026", "2026-01-15", "", "Finance Department", "TRAVEL", "LOCAL_TRANSPORT", "80000"],
  ["AIE/2026/01/0002", "2026", "2026-01-20", "2026-03-31", "Operations Unit", "UTILITIES", "ELECTRICITY", "200000"],
];

type UploadedAie = {
  aieNo: string;
  fiscalYear: number;
  issueDate: string;
  expiresOn?: string;
  recipientUnit: string;
  lines: { itemCode: AieItemCode; subItemCode: string; amount: number }[];
  errors: string[];
};

type SubmitResult = { aieNo: string; ok: boolean; message: string };

function parseAieUpload(rows: string[][]): UploadedAie[] {
  if (!rows.length) return [];
  const header = rows[0].map(h => h.trim().toLowerCase());
  const idx = (name: string) => header.findIndex(h => h === name.toLowerCase());
  const iAieNo = idx("aie no");
  const iFy = idx("fiscal year");
  const iDate = idx("issue date");
  const iExp = idx("expires on");
  const iUnit = idx("recipient unit");
  const iItem = idx("item code");
  const iSub = idx("sub-item code");
  const iAmt = idx("amount");

  const missing = [
    iAieNo < 0 && "AIE No",
    iFy < 0 && "Fiscal Year",
    iDate < 0 && "Issue Date",
    iUnit < 0 && "Recipient Unit",
    iItem < 0 && "Item Code",
    iSub < 0 && "Sub-Item Code",
    iAmt < 0 && "Amount",
  ].filter(Boolean);
  if (missing.length) {
    return [{ aieNo: "(header error)", fiscalYear: 0, issueDate: "", recipientUnit: "", lines: [], errors: [`Missing columns: ${missing.join(", ")}`] }];
  }

  const map = new Map<string, UploadedAie>();
  rows.slice(1).forEach((r, ri) => {
    const aieNo = (r[iAieNo] ?? "").trim().toUpperCase();
    if (!aieNo) return;
    const rowLabel = `Row ${ri + 2}`;
    const errors: string[] = [];

    if (!map.has(aieNo)) {
      const fy = Number((r[iFy] ?? "").replace(/\D/g, ""));
      const issueDate = (r[iDate] ?? "").trim();
      const expiresOn = iExp >= 0 ? (r[iExp] ?? "").trim() : "";
      const recipientUnit = (r[iUnit] ?? "").trim();

      if (!Number.isInteger(fy) || fy < 2000 || fy > 2100) errors.push(`${rowLabel}: Fiscal Year "${r[iFy]}" is invalid.`);
      if (!issueDate) errors.push(`${rowLabel}: Issue Date is required.`);
      if (!AIE_NO_PATTERN.test(aieNo)) errors.push(`${rowLabel}: AIE No "${aieNo}" must match AIE/YYYY/MM/NNNN.`);
      if (!recipientUnit) errors.push(`${rowLabel}: Recipient Unit is required.`);
      if (expiresOn && issueDate && expiresOn <= issueDate) errors.push(`${rowLabel}: Expires On must be after Issue Date.`);

      map.set(aieNo, { aieNo, fiscalYear: fy, issueDate, expiresOn: expiresOn || undefined, recipientUnit, lines: [], errors });
    }

    const entry = map.get(aieNo)!;
    const itemCode = (r[iItem] ?? "").trim().toUpperCase();
    const subItemCode = (r[iSub] ?? "").trim().toUpperCase();
    const amount = Number((r[iAmt] ?? "").replace(/[^\d.-]/g, ""));

    if (!(AIE_ITEM_CODES as readonly string[]).includes(itemCode)) {
      entry.errors.push(`${rowLabel}: Item Code "${itemCode}" is not valid. Must be one of: ${AIE_ITEM_CODES.join(", ")}.`);
    } else if (!subItemCode) {
      entry.errors.push(`${rowLabel}: Sub-Item Code is required.`);
    } else if (!Number.isFinite(amount) || amount <= 0) {
      entry.errors.push(`${rowLabel}: Amount "${r[iAmt]}" must be a positive number.`);
    } else {
      entry.lines.push({ itemCode: itemCode as AieItemCode, subItemCode, amount: Math.round(amount * 100) / 100 });
    }
  });

  return Array.from(map.values()).map(e => {
    if (e.errors.length === 0 && e.lines.length === 0) {
      e.errors.push("No valid line items found for this AIE.");
    }
    return e;
  });
}

function AieBulkUploadDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<UploadedAie[]>([]);
  const [results, setResults] = useState<SubmitResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<"idle" | "preview" | "done">("idle");

  const reset = () => { setParsed([]); setResults([]); setPhase("idle"); if (fileRef.current) fileRef.current.value = ""; };
  const handleClose = () => { reset(); onClose(); };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseUpload(file);
      const aies = parseAieUpload(rows);
      setParsed(aies);
      setPhase("preview");
    } catch (err) {
      toast.error("Could not read file. Make sure it's a valid CSV or XLSX.");
    }
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([UPLOAD_HEADERS, ...SAMPLE_ROWS]);
    XLSX.utils.book_append_sheet(wb, ws, "AIE Template");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "aie_upload_template.xlsx";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const submit = async () => {
    const valid = parsed.filter(a => a.errors.length === 0);
    if (!valid.length) return;
    setSubmitting(true);
    const out: SubmitResult[] = [];
    for (const a of valid) {
      try {
        await createAie({ fiscalYear: a.fiscalYear, aieNo: a.aieNo, issueDate: a.issueDate, expiresOn: a.expiresOn, recipientUnit: a.recipientUnit, lineItems: a.lines });
        out.push({ aieNo: a.aieNo, ok: true, message: "Created" });
      } catch (e) {
        out.push({ aieNo: a.aieNo, ok: false, message: e instanceof ApiError ? e.message : "Failed" });
      }
    }
    setResults(out);
    setPhase("done");
    setSubmitting(false);
    if (out.some(r => r.ok)) onDone();
  };

  const validCount = parsed.filter(a => a.errors.length === 0).length;
  const errorCount = parsed.filter(a => a.errors.length > 0).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Upload AIE records</DialogTitle>
          <DialogDescription>
            One row per line item. Rows sharing the same AIE No are merged into a single record.
          </DialogDescription>
        </DialogHeader>

        {phase === "idle" && (
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-[12px] text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Required columns (exact header names):</p>
              <p className="font-mono text-[11px]">{UPLOAD_HEADERS.join(", ")}</p>
              <p className="mt-1"><span className="font-medium text-foreground">Item Code</span> must be one of: {AIE_ITEM_CODES.join(", ")}.</p>
              <p><span className="font-medium text-foreground">AIE No</span> format: AIE/YYYY/MM/NNNN (e.g. AIE/2026/01/0001).</p>
              <p><span className="font-medium text-foreground">Expires On</span> is optional — leave blank if not applicable.</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-3.5 w-3.5 mr-1" />Download template
              </Button>
              <label className="inline-flex">
                <Button type="button" size="sm" asChild>
                  <span><Upload className="h-3.5 w-3.5 mr-1" />Choose file</span>
                </Button>
                <input ref={fileRef} type="file" accept={UPLOAD_ACCEPT} className="hidden" onChange={onFile} />
              </label>
            </div>
          </div>
        )}

        {phase === "preview" && (
          <div className="flex-1 overflow-y-auto space-y-3">
            <div className="flex items-center gap-3 text-[12px]">
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />{validCount} ready</span>
              {errorCount > 0 && <span className="inline-flex items-center gap-1 text-destructive"><AlertCircle className="h-3.5 w-3.5" />{errorCount} with errors (will be skipped)</span>}
            </div>
            <div className="rounded-md border border-border divide-y divide-border max-h-72 overflow-y-auto text-[12px]">
              {parsed.map((a) => (
                <div key={a.aieNo} className={`px-3 py-2 ${a.errors.length ? "bg-destructive/5" : ""}`}>
                  <div className="flex items-center gap-2">
                    {a.errors.length === 0
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      : <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                    <span className="font-mono font-semibold">{a.aieNo}</span>
                    {a.errors.length === 0 && (
                      <span className="text-muted-foreground ml-auto">{a.lines.length} line{a.lines.length === 1 ? "" : "s"} · {a.recipientUnit} · FY {a.fiscalYear}</span>
                    )}
                  </div>
                  {a.errors.length > 0 && (
                    <ul className="mt-1 ml-6 text-[11px] text-destructive space-y-0.5">
                      {a.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="flex-1 overflow-y-auto space-y-2">
            <p className="text-[12px] text-muted-foreground">{results.filter(r => r.ok).length} created · {results.filter(r => !r.ok).length} failed</p>
            <div className="rounded-md border border-border divide-y divide-border max-h-72 overflow-y-auto text-[12px]">
              {results.map(r => (
                <div key={r.aieNo} className="flex items-center gap-2 px-3 py-2">
                  {r.ok
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    : <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                  <span className="font-mono">{r.aieNo}</span>
                  <span className={`ml-auto text-[11px] ${r.ok ? "text-muted-foreground" : "text-destructive"}`}>{r.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          {phase === "idle" && (
            <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
          )}
          {phase === "preview" && (
            <>
              <Button type="button" variant="ghost" onClick={reset}>Back</Button>
              <Button type="button" onClick={submit} disabled={submitting || validCount === 0}>
                {submitting && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                Import {validCount} AIE{validCount === 1 ? "" : "s"}
              </Button>
            </>
          )}
          {phase === "done" && (
            <Button type="button" onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AIERecordsPage() {
  const [tab, setTab] = useState<Tab>("ALL");
  const [rows, setRows] = useState<Aie[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [fyFilter, setFyFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);
  const [rejecting, setRejecting] = useState<Aie | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSaving, setRejectSaving] = useState(false);

  const [fyTotalsYear, setFyTotalsYear] = useState<number>(currentYear);
  const [fyTotal, setFyTotal] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [budgetRefLoading, setBudgetRefLoading] = useState(false);

  useEffect(() => {
    document.title = "AIE Records – NPF BMS";
  }, []);

  useEffect(() => {
    if (!editor.open) return;
    setBudgetRefLoading(true);
    getBudgetCodeReference()
      .then(ref => setBudgetCategories(ref.categories))
      .catch(() => toast.error("Could not load budget codes."))
      .finally(() => setBudgetRefLoading(false));
  }, [editor.open]);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof listAies>[0] = {};
      if (fyFilter !== "ALL") params.fiscalYear = Number(fyFilter);
      if (statusFilter !== "ALL") params.status = statusFilter as AieStatus;
      const data = await listAies(params);
      setRows(data);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load AIEs.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchTotals = async (year: number) => {
    try {
      const res = await getAieFyTotals(year);
      const total = Number(res?.totalAmount ?? 0);
      setFyTotal(Number.isFinite(total) ? total : 0);
    } catch {
      setFyTotal(null);
    }
  };

  useEffect(() => { fetchRows(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [fyFilter, statusFilter]);
  useEffect(() => { fetchTotals(fyTotalsYear); }, [fyTotalsYear]);

  // Tab shortcuts map to status filters; server enforces real queue access.
  useEffect(() => {
    if (tab === "REVIEW") setStatusFilter("PENDING_REVIEW");
    else if (tab === "APPROVAL") setStatusFilter("PENDING_APPROVAL");
  }, [tab]);

  const fiscalYears = useMemo(() => {
    const set = new Set<number>(rows.map(r => r.fiscalYear ?? new Date(r.issueDate).getFullYear()));
    [currentYear - 1, currentYear, currentYear + 1].forEach(y => set.add(y));
    return Array.from(set).sort((a, b) => b - a);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (!q) return true;
      return (
        (r.aieNo ?? "").toLowerCase().includes(q) ||
        (r.recipientUnit ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const openCreate = () =>
    setEditor({ ...EMPTY_EDITOR, open: true, mode: "create", issueDate: today(), lines: [{ ...EMPTY_LINE }] });

  const openEdit = (r: Aie) =>
    setEditor({
      open: true,
      mode: "edit",
      id: r.id,
      fiscalYear: String(r.fiscalYear ?? new Date(r.issueDate).getFullYear()),
      aieNo: r.aieNo ?? "",
      issueDate: r.issueDate?.slice(0, 10) ?? today(),
      expiresOn: r.expiresOn?.slice(0, 10) ?? "",
      recipientUnit: r.recipientUnit ?? "",
      lines: (r.lineItems ?? []).length
        ? r.lineItems.map(l => ({
            itemCode: l.itemCode,
            subItemCode: l.subItemCode,
            amount: String(l.amount ?? ""),
          }))
        : [{ ...EMPTY_LINE }],
      saving: false,
    });

  const updateLine = (idx: number, patch: Partial<LineDraft>) =>
    setEditor(p => ({ ...p, lines: p.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)) }));

  const addLine = () => setEditor(p => ({ ...p, lines: [...p.lines, { ...EMPTY_LINE }] }));
  const removeLine = (idx: number) =>
    setEditor(p => ({ ...p, lines: p.lines.length > 1 ? p.lines.filter((_, i) => i !== idx) : p.lines }));

  const editorTotal = useMemo(
    () => editor.lines.reduce((s, l) => s + (Number(l.amount) || 0), 0),
    [editor.lines],
  );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const fy = Number(editor.fiscalYear);
    if (!Number.isInteger(fy) || fy < 2000 || fy > 2100) {
      toast.error("Fiscal year must be between 2000 and 2100."); return;
    }
    if (!AIE_NO_PATTERN.test(editor.aieNo)) {
      toast.error("AIE No must match AIE/YYYY/MM/NNNN (e.g. AIE/2026/03/0017)."); return;
    }
    if (!editor.recipientUnit.trim()) { toast.error("Recipient unit is required."); return; }
    if (editor.expiresOn && editor.expiresOn <= editor.issueDate) {
      toast.error("Expiry must be after issue date."); return;
    }
    const lines: AieLineItem[] = [];
    for (let i = 0; i < editor.lines.length; i++) {
      const l = editor.lines[i];
      const amt = Number(l.amount);
      if (!l.itemCode) { toast.error(`Line ${i + 1}: item code is required.`); return; }
      if (!l.subItemCode.trim()) { toast.error(`Line ${i + 1}: sub-item code is required.`); return; }
      if (!Number.isFinite(amt) || amt <= 0) { toast.error(`Line ${i + 1}: amount must be positive.`); return; }
      lines.push({ itemCode: l.itemCode as AieItemCode, subItemCode: l.subItemCode.trim(), amount: Math.round(amt * 100) / 100 });
    }

    setEditor(p => ({ ...p, saving: true }));
    try {
      const payload = {
        fiscalYear: fy,
        aieNo: editor.aieNo.trim(),
        issueDate: editor.issueDate,
        expiresOn: editor.expiresOn || undefined,
        recipientUnit: editor.recipientUnit.trim(),
        lineItems: lines,
      };
      if (editor.mode === "create") {
        await createAie(payload);
        toast.success("Draft AIE created.");
      } else if (editor.id) {
        await updateAie(editor.id, payload);
        toast.success("AIE updated.");
      }
      setEditor(EMPTY_EDITOR);
      fetchRows();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to save.";
      toast.error(msg);
      setEditor(p => ({ ...p, saving: false }));
    }
  };

  const wrap = async (label: string, fn: () => Promise<unknown>) => {
    try { await fn(); toast.success(label); fetchRows(); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : `${label} failed.`); }
  };

  const remove = (r: Aie) => {
    if (!confirm(`Delete draft ${r.aieNo || r.id.slice(0, 8)}?`)) return;
    wrap("Draft deleted.", () => deleteAie(r.id));
  };

  const submitReject = async () => {
    if (!rejecting) return;
    const reason = rejectReason.trim();
    if (reason.length < 5) { toast.error("Reason must be at least 5 characters."); return; }
    setRejectSaving(true);
    try {
      await rejectAie(rejecting.id, reason);
      toast.success("AIE rejected.");
      setRejecting(null); setRejectReason(""); fetchRows();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Reject failed.");
    } finally {
      setRejectSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold font-serif flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            AIE Records
          </h1>
          <p className="text-[12px] text-muted-foreground">
            Issue Authority-to-Incur-Expenditure (AIE) and walk it through review and approval.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={fetchRows} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="h-3.5 w-3.5 mr-1" />
            Upload CSV/XLSX
          </Button>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New AIE
          </Button>
        </div>
      </div>

      {/* FY totals */}
      <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-[12px] text-muted-foreground">FY totals</Label>
          <Select value={String(fyTotalsYear)} onValueChange={(v) => setFyTotalsYear(Number(v))}>
            <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {fiscalYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="text-lg font-semibold font-serif">
          {fyTotal === null ? <span className="text-muted-foreground text-sm">—</span> : fmtNGN(fyTotal)}
        </div>
        <span className="text-[11px] text-muted-foreground">approved AIE amount</span>
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
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search AIE no, purpose…" className="pl-8 h-9 w-64" />
          </div>
          <Select value={fyFilter} onValueChange={setFyFilter}>
            <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Fiscal year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All years</SelectItem>
              {fiscalYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {AIE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[140px_110px_110px_1fr_140px_140px_220px] gap-3 px-4 py-2 border-b border-border bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div>AIE No</div>
          <div>Issued</div>
          <div>Expires</div>
          <div>Purpose</div>
          <div className="text-right">Total</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>
        {loading ? (
          <div className="px-4 py-10 text-center text-[12px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-[12px] text-muted-foreground">No AIE records found.</div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map(r => {
              const total = Number(r.totalAmount ?? linesTotal(r.lineItems));
              return (
                <li key={r.id} className="grid grid-cols-[140px_110px_110px_1fr_140px_140px_220px] gap-3 px-4 py-2.5 text-[12.5px] items-center">
                  <div className="font-mono truncate">{r.aieNo || "—"}</div>
                  <div>{r.issueDate?.slice(0, 10)}</div>
                  <div>{r.expiresOn?.slice(0, 10) || "—"}</div>
                  <div className="min-w-0">
                    <div className="truncate">{r.recipientUnit}</div>
                    <div className="text-[11.5px] text-muted-foreground truncate">
                      FY {r.fiscalYear} • {(r.lineItems ?? []).length} line{(r.lineItems ?? []).length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="text-right font-semibold">{fmtNGN(total)}</div>
                  <div><Badge variant={STATUS_VARIANT[r.status]} className="text-[10.5px]">{r.status}</Badge></div>
                  <div className="flex justify-end gap-1 flex-wrap">
                    {r.status === "DRAFT" && (
                      <>
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(r)} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2" title="Submit for review"
                          onClick={() => wrap("Submitted for review.", () => submitAie(r.id))}><Send className="h-3.5 w-3.5" /></Button>
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" title="Delete draft" onClick={() => remove(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </>
                    )}
                    {r.status === "PENDING_REVIEW" && (
                      <>
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2" title="Officer review"
                          onClick={() => wrap("Reviewed.", () => reviewAie(r.id))}><Check className="h-3.5 w-3.5" /></Button>
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" title="Reject"
                          onClick={() => { setRejecting(r); setRejectReason(""); }}><XCircle className="h-3.5 w-3.5" /></Button>
                      </>
                    )}
                    {r.status === "PENDING_APPROVAL" && (
                      <>
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2" title="Approve"
                          onClick={() => wrap("Approved.", () => approveAie(r.id))}><Check className="h-3.5 w-3.5" /></Button>
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" title="Reject"
                          onClick={() => { setRejecting(r); setRejectReason(""); }}><XCircle className="h-3.5 w-3.5" /></Button>
                      </>
                    )}
                    {r.status === "REJECTED" && (
                      <Button type="button" size="sm" variant="ghost" className="h-7 px-2" title="Reopen"
                        onClick={() => wrap("Reopened.", () => reopenAie(r.id))}><RotateCcw className="h-3.5 w-3.5" /></Button>
                    )}
                    {r.status === "APPROVED" && (
                      <span className="text-[11px] text-muted-foreground italic px-2">approved</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Editor dialog */}
      <Dialog open={editor.open} onOpenChange={(o) => { if (!o) setEditor(EMPTY_EDITOR); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editor.mode === "create" ? "New AIE" : "Edit AIE"}</DialogTitle>
            <DialogDescription>
              Authority-to-Incur-Expenditure. Drafts can be edited and deleted; submit moves it into the review queue.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="aie-fy">Fiscal year</Label>
                <Input id="aie-fy" type="number" min={2000} max={2100} value={editor.fiscalYear}
                  onChange={e => setEditor(p => ({ ...p, fiscalYear: e.target.value }))} required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="aie-no">AIE No</Label>
                <Input id="aie-no" value={editor.aieNo}
                  onChange={e => setEditor(p => ({ ...p, aieNo: e.target.value.toUpperCase() }))}
                  placeholder="AIE/2026/03/0017" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="aie-issue">Issue date</Label>
                <Input id="aie-issue" type="date" value={editor.issueDate}
                  onChange={e => setEditor(p => ({ ...p, issueDate: e.target.value }))} required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="aie-exp">Expires on</Label>
                <Input id="aie-exp" type="date" value={editor.expiresOn}
                  onChange={e => setEditor(p => ({ ...p, expiresOn: e.target.value }))} />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="aie-recipient">Recipient unit</Label>
              <Input id="aie-recipient" maxLength={200} value={editor.recipientUnit}
                onChange={e => setEditor(p => ({ ...p, recipientUnit: e.target.value }))} required
                placeholder="Finance Department" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Line items</Label>
                <div className="text-[12px] text-muted-foreground">
                  Total: <span className="font-semibold text-foreground">{fmtNGN(editorTotal)}</span>
                </div>
              </div>
              {budgetRefLoading ? (
                <div className="flex items-center gap-2 py-4 text-[12px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />Loading budget codes…
                </div>
              ) : (
                <div className="border border-border rounded-md divide-y divide-border max-h-72 overflow-y-auto">
                  {editor.lines.map((l, idx) => {
                    const catSubItems = budgetCategories.find(c => c.code === l.itemCode)?.subItems ?? [];
                    return (
                      <div key={idx} className="grid grid-cols-[1fr_1fr_140px_36px] gap-2 px-2 py-2 items-center">
                        <Select value={l.itemCode || undefined}
                          onValueChange={(v) => updateLine(idx, { itemCode: v, subItemCode: "" })}>
                          <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Category" /></SelectTrigger>
                          <SelectContent>
                            {budgetCategories.map(c => (
                              <SelectItem key={c.code} value={c.code} className="text-[12px]">
                                <span className="font-mono">{c.code}</span>
                                <span className="text-muted-foreground ml-1">— {c.name}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={l.subItemCode || undefined}
                          onValueChange={(v) => updateLine(idx, { subItemCode: v })}
                          disabled={!l.itemCode || catSubItems.length === 0}>
                          <SelectTrigger className="h-8 text-[12px]">
                            <SelectValue placeholder={l.itemCode ? "Sub-item" : "Pick category first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {catSubItems.map(s => (
                              <SelectItem key={s.code} value={s.code} className="text-[12px]">
                                <span className="font-mono">{s.code}</span>
                                <span className="text-muted-foreground ml-1">— {s.name}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input type="number" min={0.01} step={0.01} value={l.amount}
                          onChange={e => updateLine(idx, { amount: e.target.value })}
                          placeholder="Amount" className="h-8 text-[12px] text-right" />
                        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => removeLine(idx)} disabled={editor.lines.length === 1} title="Remove line">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button type="button" size="sm" variant="outline" onClick={addLine} disabled={budgetRefLoading}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add line
              </Button>
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

      {/* Bulk upload dialog */}
      <AieBulkUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onDone={fetchRows} />

      {/* Reject dialog */}
      <Dialog open={!!rejecting} onOpenChange={(o) => { if (!o) { setRejecting(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject AIE</DialogTitle>
            <DialogDescription>
              Provide a clear reason — the submitter will see it and may reopen the record after addressing it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="aie-rej">Reason</Label>
            <Textarea id="aie-rej" rows={4} value={rejectReason}
              onChange={e => setRejectReason(e.target.value)} minLength={5} maxLength={1000}
              placeholder="Explain why this AIE is being rejected (min 5 characters)." />
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