import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowUpDown, Pencil, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { SEED_SUMMARY_TABLE1, type SummaryRow, type Period } from "@/data/distributionBreakdown";
import { loadPeriods, savePeriods, subscribePeriods, cloneZeroedZoneGroups } from "@/lib/distributionPeriodsStore";

const SUMMARY_STORAGE_KEY = "npf:distributionSummary:v2";
const fmtN = (n: number) => new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const NIGERIA_STATES = ["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"];
function extractStateFromName(name: string): string {
  const u = (name || "").toUpperCase();
  for (const s of NIGERIA_STATES) if (u.includes(s.toUpperCase())) return s;
  return "—";
}

type SummaryByPeriod = Record<string, SummaryRow[]>;

function loadSummary(): SummaryByPeriod {
  try {
    const raw = localStorage.getItem(SUMMARY_STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as SummaryByPeriod;
      if (p && typeof p === "object") return p;
    }
  } catch {}
  return {};
}
function saveSummary(s: SummaryByPeriod) {
  try { localStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(s)); } catch {}
}
function rowsForPeriod(store: SummaryByPeriod, periodId: string): SummaryRow[] {
  if (store[periodId]) return store[periodId];
  // Default seed for the first known period; otherwise zeroed clone of seed structure.
  return SEED_SUMMARY_TABLE1.map(r => ({ ...r }));
}

type SortDir = "asc" | "desc" | null;

function useSort<T>(rows: T[]) {
  const [key, setKey] = useState<keyof T | null>(null);
  const [dir, setDir] = useState<SortDir>(null);
  const toggle = (k: keyof T) => {
    if (key !== k) { setKey(k); setDir("asc"); return; }
    setDir(d => d === "asc" ? "desc" : d === "desc" ? null : "asc");
  };
  const sorted = useMemo(() => {
    if (!key || !dir) return rows;
    const r = [...rows].sort((a, b) => {
      const av = a[key] as unknown as number | string;
      const bv = b[key] as unknown as number | string;
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av).localeCompare(String(bv));
    });
    if (dir === "desc") r.reverse();
    return r;
  }, [rows, key, dir]);
  return { sorted, sortKey: key, sortDir: dir, toggle };
}

export default function DistributionSummaryView() {
  const [periods, setPeriods] = useState<Period[]>(loadPeriods);
  const [activePeriodId, setActivePeriodId] = useState<string>(() => loadPeriods().slice(-1)[0]?.id ?? "");
  const [store, setStore] = useState<SummaryByPeriod>(loadSummary);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("ALL");
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => { saveSummary(store); }, [store]);

  // Reset state filter whenever the selected period changes — different
  // periods may have different formations present.
  useEffect(() => { setStateFilter("ALL"); }, [activePeriodId]);

  useEffect(() => {
    return subscribePeriods(() => {
      const next = loadPeriods();
      setPeriods(next);
      setActivePeriodId(prev => next.find(p => p.id === prev) ? prev : (next.slice(-1)[0]?.id ?? ""));
    });
  }, []);

  const activePeriod = useMemo(() => periods.find(p => p.id === activePeriodId) ?? periods[periods.length - 1], [periods, activePeriodId]);
  const currentRows = useMemo(() => rowsForPeriod(store, activePeriod?.id ?? ""), [store, activePeriod]);

  const table1 = useMemo(() => currentRows.map(r => ({ ...r, difference: (Number(r.allocation) || 0) - (Number(r.fromDist) || 0) })), [currentRows]);

  const q = search.trim().toLowerCase();
  const f1 = table1.filter(r => {
    if (q && !r.name.toLowerCase().includes(q)) return false;
    if (stateFilter !== "ALL" && extractStateFromName(r.name) !== stateFilter) return false;
    return true;
  });

  // Dropdown built from states/formations actually present in current period's rows.
  const availableStates = useMemo(() => {
    const set = new Set<string>();
    for (const r of table1) {
      const s = extractStateFromName(r.name);
      if (s && s !== "—") set.add(s);
    }
    return Array.from(set).sort();
  }, [table1]);

  const s1 = useSort(f1);

  const total1 = f1.reduce((s, r) => ({ allocation: s.allocation + r.allocation, fromDist: s.fromDist + r.fromDist, difference: s.difference + r.difference }), { allocation: 0, fromDist: 0, difference: 0 });

  const savePeriodRows = (periodId: string, rows: SummaryRow[]) => {
    setStore(prev => ({ ...prev, [periodId]: rows }));
  };

  const handleAddPeriod = (id: string, label: string, rows: SummaryRow[]) => {
    if (!id.trim() || !label.trim()) { toast.error("Provide a period id and label."); return; }
    if (periods.some(p => p.id === id)) { toast.error("A period with that id already exists."); return; }
    // Add to summary store
    setStore(prev => ({ ...prev, [id]: rows }));
    // Mirror into the shared periods list so it appears in the Breakdown sub-tab too.
    const template = periods[periods.length - 1];
    const nCols = template?.columns?.length ?? 2;
    const nextPeriods: Period[] = [
      ...periods,
      { id, label, columns: template?.columns ?? ["Amount"], data: cloneZeroedZoneGroups(template?.data, nCols) },
    ].sort((a, b) => a.id.localeCompare(b.id));
    setPeriods(nextPeriods);
    savePeriods(nextPeriods);
    setActivePeriodId(id);
    setAddOpen(false);
    toast.success(`Period "${label}" added.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">Bi-monthly period</Label>
            <Select value={activePeriod?.id ?? ""} onValueChange={setActivePeriodId}>
              <SelectTrigger className="h-9 w-[200px] mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {periods.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Search formation / zone</Label>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="e.g. Zone 7, Lagos, Commissioner" className="h-9 w-[260px] mt-1" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">State</Label>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="h-9 w-[180px] mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="ALL">All states</SelectItem>
                {availableStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activePeriod && (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-1" />Edit period
            </Button>
          )}
          <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Period</Button>
        </div>
      </div>

      {!activePeriod && <p className="text-sm text-muted-foreground">No periods yet. Click "Add Period" to begin.</p>}

      {activePeriod && <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">Table 1 — All Commands and Formations <span className="text-muted-foreground font-normal text-[12px]">· {activePeriod.label}</span></CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-[12px] border-separate border-spacing-0">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2 w-12 sticky left-0 z-30 bg-muted/95 shadow-[1px_0_0_hsl(var(--border))]">S/No.</th>
                  <ThSort className="sticky left-[48px] z-30 bg-muted/95 shadow-[1px_0_0_hsl(var(--border))] min-w-[260px]" onClick={() => s1.toggle("name")}>Commands/Formations</ThSort>
                  <ThSort className="text-right" onClick={() => s1.toggle("allocation")}>Allocation (₦)</ThSort>
                  <ThSort className="text-right" onClick={() => s1.toggle("fromDist")}>From Distribution (₦)</ThSort>
                  <ThSort className="text-right" onClick={() => s1.toggle("difference")}>Difference (₦)</ThSort>
                </tr>
              </thead>
              <tbody>
                {s1.sorted.map((r, i) => (
                  <tr key={i} className="group border-t border-border">
                    <td className="px-3 py-1.5 sticky left-0 z-20 bg-card group-hover:bg-muted/20 shadow-[1px_0_0_hsl(var(--border))] w-12">{i + 1}</td>
                    <td className="px-3 py-1.5 sticky left-[48px] z-20 bg-card group-hover:bg-muted/20 shadow-[1px_0_0_hsl(var(--border))] min-w-[260px]">{r.name}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtN(r.allocation)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtN(r.fromDist)}</td>
                    <td className={`px-3 py-1.5 text-right tabular-nums font-medium ${r.difference < 0 ? "text-red-600" : "text-emerald-600"}`}>{fmtN(r.difference)}</td>
                  </tr>
                ))}
                <tr className="border-t border-border bg-muted/40 font-semibold">
                  <td className="px-3 py-1.5 sticky left-0 z-20 bg-muted/80 shadow-[1px_0_0_hsl(var(--border))] w-12">Total</td>
                  <td className="px-3 py-1.5 sticky left-[48px] z-20 bg-muted/80 shadow-[1px_0_0_hsl(var(--border))] min-w-[260px]" />
                  <td className="px-3 py-1.5 text-right tabular-nums">{fmtN(total1.allocation)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{fmtN(total1.fromDist)}</td>
                  <td className={`px-3 py-1.5 text-right tabular-nums ${total1.difference < 0 ? "text-red-600" : "text-emerald-600"}`}>{fmtN(total1.difference)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>}

      <EditPeriodSummaryDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={activePeriod ? `Edit summary — ${activePeriod.label}` : "Edit summary"}
        rows={currentRows}
        onSave={(rows) => {
          if (!activePeriod) return;
          savePeriodRows(activePeriod.id, rows);
          setEditOpen(false);
          toast.success("Summary updated.");
        }}
      />

      <AddPeriodSummaryDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        templateRows={currentRows.length ? currentRows : SEED_SUMMARY_TABLE1}
        onSave={handleAddPeriod}
      />
    </div>
  );
}

function ThSort({ children, onClick, className }: { children: React.ReactNode; onClick: () => void; className?: string }) {
  return (
    <th className={`px-3 py-2 ${className ?? ""}`}>
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1 font-medium hover:text-primary">
        {children}<ArrowUpDown className="h-3 w-3 opacity-60" />
      </button>
    </th>
  );
}

function EditPeriodSummaryDialog({
  open, onClose, title, rows, onSave,
}: {
  open: boolean; onClose: () => void; title: string; rows: SummaryRow[]; onSave: (rows: SummaryRow[]) => void;
}) {
  const [draft, setDraft] = useState<SummaryRow[]>(rows);
  useEffect(() => { if (open) setDraft(JSON.parse(JSON.stringify(rows))); }, [open, rows]);

  const update = (idx: number, field: "allocation" | "fromDist", val: string) => {
    setDraft(prev => {
      const next = prev.map(r => ({ ...r }));
      next[idx] = { ...next[idx], [field]: Number(val) || 0 } as SummaryRow;
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <p className="text-[11px] text-muted-foreground">Difference auto-calculates as Allocation − From Distribution.</p>
        <div className="overflow-y-auto flex-1 space-y-4">
          <SummaryEditTable
            title="Table 1 — All Commands and Formations"
            rows={draft}
            getName={(r) => r.name}
            onChange={update}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(draft)}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddPeriodSummaryDialog({
  open, onClose, templateRows, onSave,
}: {
  open: boolean; onClose: () => void; templateRows: SummaryRow[];
  onSave: (id: string, label: string, rows: SummaryRow[]) => void;
}) {
  const [periodId, setPeriodId] = useState("");
  const [label, setLabel] = useState("");
  const [draft, setDraft] = useState<SummaryRow[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setPeriodId("");
      setLabel("");
      // Seed structure but zero out the amounts so user can enter fresh values.
      setDraft(templateRows.map(r => ({ name: r.name, allocation: 0, fromDist: 0 })));
      setUnmatched([]);
    }
  }, [open, templateRows]);

  const update = (idx: number, field: "allocation" | "fromDist", val: string) => {
    setDraft(prev => {
      const next = prev.map(r => ({ ...r }));
      next[idx] = { ...next[idx], [field]: Number(val) || 0 } as SummaryRow;
      return next;
    });
  };

  const handleUpload = async (file: File) => {
    const { parseUpload } = await import("@/lib/tableUpload");
    const all = await parseUpload(file);
    if (!all.length) return;
    const header = all.shift()!.map(h => h.trim().toLowerCase());
    const rows = all;
    const idxName = header.findIndex(h => h.includes("formation") || h.includes("command") || h.includes("name"));
    const idxAlloc = header.findIndex(h => h.includes("allocation"));
    const idxDist = header.findIndex(h => h.includes("distribution"));
    if (idxName < 0 || (idxAlloc < 0 && idxDist < 0)) {
      toast.error("File must include Commands/Formations and Allocation / From Distribution columns.");
      return;
    }
    const toNum = (v: any) => Number(String(v ?? "").replace(/[^\d.-]/g, "") || 0);
    const next = draft.map(r => ({ ...r }));
    const unmatchedRows: string[] = [];
    for (const cols of rows) {
      if (!cols || !cols.length) continue;
      const name = cols[idxName]?.trim();
      if (!name) continue;
      const i = next.findIndex(r => r.name.toLowerCase() === name.toLowerCase());
      if (i < 0) { unmatchedRows.push(name); continue; }
      if (idxAlloc >= 0) next[i].allocation = toNum(cols[idxAlloc]);
      if (idxDist >= 0) next[i].fromDist = toNum(cols[idxDist]);
    }
    setDraft(next);
    setUnmatched(unmatchedRows);
    toast.success(`Imported. ${unmatchedRows.length} row(s) unmatched.`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle>Add bi-monthly period</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px]">Period id (sortable)</Label>
            <Input value={periodId} onChange={e => setPeriodId(e.target.value)} placeholder="e.g. 2026-05" className="h-9 mt-1" />
          </div>
          <div>
            <Label className="text-[11px]">Period label</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. May–June 2026" className="h-9 mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <label className="inline-flex items-center gap-2 text-[12px] cursor-pointer">
            <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1">
              <Upload className="h-3.5 w-3.5" /> Upload CSV/XLSX
            </span>
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
          </label>
          <span className="text-[11px] text-muted-foreground">
            Columns: Commands/Formations, Allocation, From Distribution. Names must match the formations already listed below.
          </span>
        </div>
        {unmatched.length > 0 && (
          <div className="text-[11px] text-destructive max-h-20 overflow-y-auto border border-destructive/30 rounded p-2">
            Unmatched: {unmatched.slice(0, 10).join("; ")}{unmatched.length > 10 ? ` … +${unmatched.length - 10} more` : ""}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">Difference auto-calculates as Allocation − From Distribution. Saving also adds this period to the Distribution Breakdown sub-tab.</p>
        <div className="overflow-y-auto flex-1 space-y-4">
          <SummaryEditTable
            title="Table 1 — All Commands and Formations"
            rows={draft}
            getName={(r) => r.name}
            onChange={update}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(periodId.trim(), label.trim(), draft)}>Save period</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryEditTable<T extends SummaryRow>({
  title, rows, getName, onChange,
}: {
  title: string; rows: T[]; getName: (r: T) => string;
  onChange: (idx: number, field: "allocation" | "fromDist", val: string) => void;
}) {
  return (
    <div>
      <div className="font-semibold text-[12px] mb-1 sticky top-0 bg-background py-1">{title}</div>
      <table className="w-full text-[11px] border border-border">
        <thead className="bg-muted/40">
          <tr className="text-left">
            <th className="px-2 py-1 w-10">#</th>
            <th className="px-2 py-1">Commands/Formations</th>
            <th className="px-2 py-1 w-36">Allocation (₦)</th>
            <th className="px-2 py-1 w-36">From Distribution (₦)</th>
            <th className="px-2 py-1 w-32 text-right">Difference</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const diff = (Number(r.allocation) || 0) - (Number(r.fromDist) || 0);
            return (
              <tr key={i} className="border-t border-border">
                <td className="px-2 py-1">{i + 1}</td>
                <td className="px-2 py-1">{getName(r)}</td>
                <td className="px-2 py-1"><Input type="number" step="0.01" value={r.allocation} onChange={e => onChange(i, "allocation", e.target.value)} className="h-7 text-right tabular-nums" /></td>
                <td className="px-2 py-1"><Input type="number" step="0.01" value={r.fromDist} onChange={e => onChange(i, "fromDist", e.target.value)} className="h-7 text-right tabular-nums" /></td>
                <td className={`px-2 py-1 text-right tabular-nums ${diff < 0 ? "text-red-600" : "text-emerald-600"}`}>{new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(diff)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}