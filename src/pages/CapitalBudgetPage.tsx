import { useEffect, useMemo, useState } from "react";
import { Banknote, Download, Search, FileSpreadsheet, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  CAPITAL_BUDGET_2026,
  CAPITAL_BUDGET_FY,
  CAPITAL_BUDGET_MDAS,
  type CapitalBudgetItem,
  type CapitalBudgetType,
} from "@/data/capitalBudget2026";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TYPE_OVERRIDE_KEY = "capital-budget-type-overrides-v1";
const CUSTOM_ROWS_KEY = "capital-budget-custom-rows-v1";
function loadOverrides(): Record<string, CapitalBudgetType> {
  try { return JSON.parse(localStorage.getItem(TYPE_OVERRIDE_KEY) || "{}"); } catch { return {}; }
}
function loadCustomRows(): CapitalBudgetItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CUSTOM_ROWS_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

const fmtNaira = (n: number) =>
  "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 0 });

function downloadCsv(rows: CapitalBudgetItem[]) {
  const head = ["ERGP Code", "Project Name", "Type", "2026 Appropriation (NGN)", "Page"];
  const esc = (v: string | number | null) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [head.join(",")]
    .concat(rows.map(r => [r.ergp, r.name, r.type, r.amount, r.page].map(esc).join(",")))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `capital-budget-${CAPITAL_BUDGET_FY}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function CapitalBudgetPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<"ALL" | CapitalBudgetType>("ALL");
  const [overrides, setOverrides] = useState<Record<string, CapitalBudgetType>>(() => loadOverrides());
  const [customRows, setCustomRows] = useState<CapitalBudgetItem[]>(() => loadCustomRows());
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ ergp: "", name: "", amount: "", page: "", type: "ONGOING" as CapitalBudgetType });

  useEffect(() => {
    try { localStorage.setItem(TYPE_OVERRIDE_KEY, JSON.stringify(overrides)); } catch {}
  }, [overrides]);
  useEffect(() => {
    try { localStorage.setItem(CUSTOM_ROWS_KEY, JSON.stringify(customRows)); } catch {}
  }, [customRows]);

  const items = useMemo(
    () => [...CAPITAL_BUDGET_2026, ...customRows].map(r => ({ ...r, type: overrides[r.ergp] ?? r.type })),
    [overrides, customRows],
  );

  const isCustom = (ergp: string) => customRows.some(r => r.ergp === ergp);

  const addRow = () => {
    const ergp = form.ergp.trim();
    const name = form.name.trim();
    const amount = Number(form.amount);
    if (!ergp || !name) { toast.error("ERGP code and project name are required."); return; }
    if (!Number.isFinite(amount) || amount <= 0) { toast.error("Amount must be greater than zero."); return; }
    if (items.some(r => r.ergp === ergp)) { toast.error(`ERGP ${ergp} already exists.`); return; }
    const page = form.page ? Number(form.page) : null;
    setCustomRows(prev => [...prev, { ergp, name, amount, type: form.type, page: Number.isFinite(page as number) ? (page as number) : null }]);
    setForm({ ergp: "", name: "", amount: "", page: "", type: "ONGOING" });
    setAddOpen(false);
    toast.success("Capital budget row added.");
  };

  const removeCustom = (ergp: string) => {
    if (!confirm(`Remove custom row ${ergp}?`)) return;
    setCustomRows(prev => prev.filter(r => r.ergp !== ergp));
  };

  const setRowType = (ergp: string, t: CapitalBudgetType) =>
    setOverrides(prev => ({ ...prev, [ergp]: t }));

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter(r => {
      if (type !== "ALL" && r.type !== type) return false;
      if (!t) return true;
      return r.ergp.toLowerCase().includes(t) || r.name.toLowerCase().includes(t);
    });
  }, [q, type, items]);

  const total = useMemo(() => items.reduce((s, r) => s + r.amount, 0), [items]);
  const totalFiltered = useMemo(() => filtered.reduce((s, r) => s + r.amount, 0), [filtered]);
  const ongoingCount = items.filter(r => r.type === "ONGOING").length;
  const completedCount = items.filter(r => r.type === "COMPLETED").length;
  const cancelledCount = items.filter(r => r.type === "CANCELLED").length;

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-sans">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Account &amp; Budget · Capital Budget
          </div>
          <h1 className="text-2xl font-serif font-semibold mt-1">
            {CAPITAL_BUDGET_FY} Appropriation Act — Capital Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Capital allocations to the {CAPITAL_BUDGET_MDAS.map(m => `${m.name} (${m.code})`).join(" and ")}.
            Sourced from the {CAPITAL_BUDGET_FY} Appropriation Act and stored separately from operational
            inflow / AIE / expenditure records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setAddOpen(v => !v)} className="gap-2">
            <Plus className="h-4 w-4" /> {addOpen ? "Close" : "Add Row"}
          </Button>
          <Button onClick={() => downloadCsv(filtered)} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </header>

      {addOpen && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base font-serif">Add Capital Budget Row</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <Input placeholder="ERGP code" value={form.ergp} onChange={e => setForm({ ...form, ergp: e.target.value })} className="md:col-span-1" />
            <Input placeholder="Project name / description" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="md:col-span-3" />
            <Input placeholder="Amount (NGN)" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            <div className="flex items-center gap-2">
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as CapitalBudgetType })}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONGOING">ONGOING</SelectItem>
                  <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                  <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Page (optional)" type="number" value={form.page} onChange={e => setForm({ ...form, page: e.target.value })} className="md:col-span-1" />
            <div className="md:col-span-5" />
            <Button onClick={addRow} className="md:col-span-1">Save Row</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-sans text-muted-foreground uppercase tracking-wide">Total Capital Appropriation</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-serif font-semibold flex items-center gap-2">
              <Banknote className="h-5 w-5 text-accent" />
              {fmtNaira(total)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{items.length} projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-sans text-muted-foreground uppercase tracking-wide">Ongoing</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-serif font-semibold">{ongoingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">In execution</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-sans text-muted-foreground uppercase tracking-wide">Completed / Cancelled</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-serif font-semibold">{completedCount} <span className="text-muted-foreground text-sm">/</span> {cancelledCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Closed-out projects</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-base font-serif">Project Register</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Showing {filtered.length} of {CAPITAL_BUDGET_2026.length} · Subtotal {fmtNaira(totalFiltered)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search ERGP code or description…"
                className="pl-8 w-72"
              />
            </div>
            <div className="flex border rounded-md overflow-hidden text-xs">
              {(["ALL", "ONGOING", "COMPLETED", "CANCELLED"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-3 py-1.5 font-sans ${type === t ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[56px]">S/N</TableHead>
                <TableHead className="w-[140px]">ERGP Code</TableHead>
                <TableHead>Project Name / Description</TableHead>
                <TableHead className="w-[150px]">Type</TableHead>
                <TableHead className="w-[180px] text-right">2026 Amount</TableHead>
                <TableHead className="w-[70px] text-right">Page</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r, i) => (
                <TableRow key={r.ergp + i}>
                  <TableCell className="align-top text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-mono text-xs align-top">{r.ergp}</TableCell>
                  <TableCell className="text-[13px] leading-relaxed align-top">{r.name}</TableCell>
                  <TableCell className="align-top">
                    <Select value={r.type} onValueChange={(v) => setRowType(r.ergp, v as CapitalBudgetType)}>
                      <SelectTrigger className="h-8 w-[130px] text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ONGOING">ONGOING</SelectItem>
                        <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                        <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right font-mono text-[13px] align-top">{fmtNaira(r.amount)}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground align-top">{r.page ?? "—"}</TableCell>
                  <TableCell className="text-right align-top">
                    {isCustom(r.ergp) && (
                      <button onClick={() => removeCustom(r.ergp)} className="text-destructive hover:text-destructive/80" title="Remove custom row">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                    No projects match the current filters.
                  </TableCell>
                </TableRow>
              )}
              {filtered.length > 0 && (
                <TableRow className="bg-muted/40 font-semibold border-t-2 border-border">
                  <TableCell colSpan={4} className="text-right uppercase text-[11px] tracking-wider text-muted-foreground">
                    Total ({filtered.length} of {items.length} project{items.length === 1 ? "" : "s"})
                  </TableCell>
                  <TableCell className="text-right font-mono text-[13px] text-primary">{fmtNaira(totalFiltered)}</TableCell>
                  <TableCell colSpan={2} className="text-right text-xs text-muted-foreground">
                    Grand total: {fmtNaira(total)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}