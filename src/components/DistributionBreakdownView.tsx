import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { BudgetCode } from "@/components/BudgetCode";
import {
  SEED_PERIODS, ZONE_GROUP_LABELS,
  type ZoneGroups, type ZoneGroupKey, type Formation, type LineItem, type Period,
} from "@/data/distributionBreakdown";
import { groupByZone } from "@/lib/zoneGrouping";
import { loadPeriods as sharedLoadPeriods, savePeriods as sharedSavePeriods, subscribePeriods } from "@/lib/distributionPeriodsStore";
import { isTotalRow } from "@/lib/distributionAggregation";

const DRAFT_KEY = "npf:distributionBreakdown:draft:v1";
const fmtN = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const loadStored = sharedLoadPeriods;

const GROUP_KEYS: ZoneGroupKey[] = ["zone1_6", "zone7_12", "zone13_17"];

export default function DistributionBreakdownView() {
  const [periods, setPeriods] = useState<Period[]>(loadStored);
  const [activePeriodId, setActivePeriodId] = useState<string>(() => loadStored().slice(-1)[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ zone1_6: true, zone7_12: true, zone13_17: true });
  const [openZones, setOpenZones] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [editMode, setEditMode] = useState<null | { id: string; label: string; columns: string[]; data: ZoneGroups }>(null);
  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    try { return !!localStorage.getItem(DRAFT_KEY); } catch { return false; }
  });

  useEffect(() => {
    sharedSavePeriods(periods);
  }, [periods]);

  // Keep in sync with periods added/edited from the Summary sub-tab.
  useEffect(() => {
    return subscribePeriods(() => {
      const next = sharedLoadPeriods();
      setPeriods(prev => JSON.stringify(prev) === JSON.stringify(next) ? prev : next);
    });
  }, []);

  const active = useMemo(() => periods.find(p => p.id === activePeriodId) ?? periods[periods.length - 1], [periods, activePeriodId]);

  const filterFormations = (forms: Formation[]) => {
    if (!search.trim()) return forms;
    const q = search.toLowerCase();
    return forms.filter(f => f.name.toLowerCase().includes(q) || f.items.some(i => i.desc.toLowerCase().includes(q) || (i.code || "").toLowerCase().includes(q)));
  };

  const handleSavePeriod = (id: string, label: string, columns: string[], data: ZoneGroups) => {
    setPeriods(prev => {
      const others = prev.filter(p => p.id !== id);
      const next = [...others, { id, label, columns, data }].sort((a, b) => a.id.localeCompare(b.id));
      return next;
    });
    setActivePeriodId(id);
    setAddOpen(false);
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setHasDraft(false);
    toast.success(`Period "${label}" saved.`);
  };

  const handleSaveDraft = (id: string, label: string, columns: string[], data: ZoneGroups) => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ id, label, columns, data, savedAt: new Date().toISOString() }));
      setHasDraft(true);
      toast.success("Draft saved. Reopen Add Period to resume.");
    } catch {
      toast.error("Could not save draft locally.");
    }
  };

  const discardDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setHasDraft(false);
    toast.message("Draft discarded.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">Bi-monthly period</Label>
            <Select value={active?.id ?? ""} onValueChange={setActivePeriodId}>
              <SelectTrigger className="h-9 w-[200px] mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {periods.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Search formation / item</Label>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="e.g. Kano, Stationery, 0301" className="h-9 w-[260px] mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasDraft && (
            <>
              <span className="text-[11px] text-amber-600 inline-flex items-center gap-1 rounded border border-amber-600/40 bg-amber-50 dark:bg-amber-950/30 px-2 py-1">
                Draft in progress
              </span>
              <Button size="sm" variant="ghost" onClick={discardDraft}>Discard draft</Button>
            </>
          )}
          {active && (
            <Button size="sm" variant="outline" onClick={() => { setEditMode({ id: active.id, label: active.label, columns: active.columns, data: active.data }); setAddOpen(true); }}>
              Edit period
            </Button>
          )}
          <Button size="sm" onClick={() => { setEditMode(null); setAddOpen(true); }}><Plus className="h-4 w-4 mr-1" />{hasDraft ? "Resume / Add Period" : "Add Period"}</Button>
        </div>
      </div>

      {!active && <p className="text-sm text-muted-foreground">No periods yet. Click "Add Period" to begin.</p>}

      {active && GROUP_KEYS.map(gk => {
        const forms = filterFormations(active.data[gk] || []);
        const zones = groupByZone(forms);
        return (
          <Collapsible key={gk} open={openGroups[gk]} onOpenChange={(o) => setOpenGroups(s => ({ ...s, [gk]: o }))}>
            <Card>
              <CardHeader className="py-3">
                <CollapsibleTrigger asChild>
                  <button type="button" className="flex items-center gap-2 w-full text-left">
                    {openGroups[gk] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <CardTitle className="text-base">{ZONE_GROUP_LABELS[gk]}</CardTitle>
                    <span className="ml-auto text-[11px] text-muted-foreground">{zones.length} zone{zones.length === 1 ? "" : "s"} · {forms.length} formation{forms.length === 1 ? "" : "s"}</span>
                  </button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-3 pt-0">
                  {zones.length === 0 && <p className="text-xs text-muted-foreground">No formations match your search.</p>}
                  {zones.map((z, zi) => {
                    const zKey = `${gk}::${z.zoneNumber}::${zi}`;
                    const zOpen = openZones[zKey] ?? true;
                    return (
                      <Collapsible key={zKey} open={zOpen} onOpenChange={(o) => setOpenZones(s => ({ ...s, [zKey]: o }))}>
                        <div className="rounded-md border border-border bg-muted/10">
                          <CollapsibleTrigger asChild>
                            <button type="button" className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-muted/30 rounded-md">
                              {zOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              <span className="text-[12.5px] font-semibold uppercase tracking-wide">
                                {z.zoneNumber > 0 ? `Zone ${z.zoneNumber}` : "Unassigned"}
                                <span className="ml-2 text-muted-foreground font-normal normal-case">— {z.zoneLabel}</span>
                              </span>
                              <span className="ml-auto text-[11px] text-muted-foreground">{z.formations.length} formation{z.formations.length === 1 ? "" : "s"}</span>
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-3 p-3 pt-0">
                              {z.formations.map((f, idx) => <FormationPanel key={`${zKey}-${idx}-${f.name}`} formation={f} columns={active.columns} />)}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      <AddPeriodDialog
        open={addOpen}
        onClose={() => { setAddOpen(false); setEditMode(null); }}
        existingPeriods={periods}
        onSave={handleSavePeriod}
        onSaveDraft={handleSaveDraft}
        initialEdit={editMode ?? undefined}
      />
    </div>
  );
}

function FormationPanel({ formation, columns }: { formation: Formation; columns: string[] }) {
  // Drop the very last column from the rendered table per spec.
  const visibleColumns = columns.length > 1 ? columns.slice(0, -1) : columns;
  const colTotals = visibleColumns.map((_, ci) => formation.items.reduce((s, i) => isTotalRow(i) ? s : s + (Number(i.amounts?.[ci]) || 0), 0));
  const provisionsAll = formation.provisions && formation.provisions.length ? formation.provisions : columns.map((_, i) => i === 0 ? (formation.provision || 0) : 0);
  const provisions = provisionsAll.slice(0, visibleColumns.length);
  const lastIdx = visibleColumns.length - 1;
  return (
    <div className="rounded-md border border-border">
      <div className="px-3 py-2 bg-muted/50 border-b border-border">
        <div className="text-[13px] font-semibold uppercase tracking-wide">{formation.name}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] border-separate border-spacing-0">
          <thead>
            <tr className="bg-muted/30">
              <th className="px-3 py-1.5 text-right font-semibold text-[12px] sticky left-0 z-30 bg-muted/95 shadow-[1px_0_0_hsl(var(--border))]" colSpan={3}>
                PROVISION:&nbsp;&nbsp;&nbsp;=N=
              </th>
              {provisions.map((p, ci) => (
                <th key={ci} className="px-3 py-1.5 w-40 text-right font-semibold tabular-nums text-[12px]">
                  {fmtN(ci === lastIdx ? colTotals[ci] : p)}
                </th>
              ))}
            </tr>
            <tr className="text-left bg-muted/20">
              <th className="px-3 py-1.5 w-16 sticky left-0 z-30 bg-muted/95 shadow-[1px_0_0_hsl(var(--border))]">S/No.</th>
              <th className="px-3 py-1.5 sticky left-[64px] z-30 bg-muted/95 min-w-[260px]">Item of Expenditure</th>
              <th className="px-3 py-1.5 w-28 sticky left-[324px] z-30 bg-muted/95 shadow-[1px_0_0_hsl(var(--border))]">Code</th>
              {visibleColumns.map((_, ci) => (
                <th key={ci} className="px-3 py-1.5 w-40 text-right">Amount =N=</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {formation.items.map((it, i) => (
              <tr key={i} className="group border-t border-border">
                <td className="px-3 py-1.5 sticky left-0 z-20 bg-card group-hover:bg-muted/20 w-16">{it.sno ?? ""}</td>
                <td className="px-3 py-1.5 sticky left-[64px] z-20 bg-card group-hover:bg-muted/20 min-w-[260px]">{it.desc}</td>
                <td className="px-3 py-1.5 sticky left-[324px] z-20 bg-card group-hover:bg-muted/20 shadow-[1px_0_0_hsl(var(--border))] w-28"><BudgetCode code={it.code} /></td>
                {visibleColumns.map((_, ci) => (
                  <td key={ci} className="px-3 py-1.5 text-right tabular-nums">
                    {it.amounts?.[ci] == null ? "" : fmtN(it.amounts[ci])}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-border bg-muted/30 font-semibold">
              <td className="px-3 py-1.5 sticky left-0 z-20 bg-muted/80 shadow-[1px_0_0_hsl(var(--border))]" colSpan={3}>Total</td>
              {colTotals.map((t, ci) => (
                <td key={ci} className="px-3 py-1.5 text-right tabular-nums">{fmtN(t)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddPeriodDialog({
  open, onClose, existingPeriods, onSave, onSaveDraft, initialEdit,
}: {
  open: boolean; onClose: () => void; existingPeriods: Period[];
  onSave: (id: string, label: string, columns: string[], data: ZoneGroups) => void;
  onSaveDraft?: (id: string, label: string, columns: string[], data: ZoneGroups) => void;
  initialEdit?: { id: string; label: string; columns: string[]; data: ZoneGroups };
}) {
  const template = existingPeriods[existingPeriods.length - 1];
  const templateColumns = initialEdit?.columns ?? template?.columns ?? ["Amount"];
  const [periodId, setPeriodId] = useState("");
  const [label, setLabel] = useState("");
  const [data, setData] = useState<ZoneGroups>(() => cloneZeroed(template?.data, templateColumns.length));
  const [unmatched, setUnmatched] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      // 1) explicit edit mode wins
      if (initialEdit) {
        setPeriodId(initialEdit.id);
        setLabel(initialEdit.label);
        setData(JSON.parse(JSON.stringify(initialEdit.data)));
        setUnmatched([]);
        return;
      }
      // Resume draft if present, otherwise start blank
      let resumed = false;
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const d = JSON.parse(raw);
          if (d && d.data) {
            setPeriodId(d.id || "");
            setLabel(d.label || "");
            setData(d.data);
            resumed = true;
            toast.message("Resumed unsaved draft.");
          }
        }
      } catch {}
      if (!resumed) {
        setPeriodId("");
        setLabel("");
        setData(cloneZeroed(template?.data, templateColumns.length));
      }
      setUnmatched([]);
    }
  }, [open, template, templateColumns.length, initialEdit]);

  const handleCsv = async (file: File) => {
    const { parseUpload } = await import("@/lib/tableUpload");
    const all = await parseUpload(file);
    if (!all.length) return;
    const header = all.shift()!.map(h => h.trim().toLowerCase());
    const rows = all;
    const idxName = header.findIndex(h => h.includes("formation"));
    const idxItem = header.findIndex(h => h.includes("item"));
    const idxCode = header.findIndex(h => h.includes("code"));
    const idxAmt = header.findIndex(h => h.includes("amount"));
    const idxCol = header.findIndex(h => h === "column" || h.includes("col index") || h === "col");
    if (idxName < 0 || idxAmt < 0) {
      toast.error("File must include Formation Name and Amount columns.");
      return;
    }
    const next = cloneZeroed(data, templateColumns.length);
    const unmatchedRows: string[] = [];
    const lastColDefault = templateColumns.length - 1;
    for (const cols of rows) {
      if (!cols || !cols.length) continue;
      const fName = cols[idxName]?.trim();
      const iDesc = idxItem >= 0 ? cols[idxItem]?.trim() : "";
      const iCode = idxCode >= 0 ? cols[idxCode]?.trim() : "";
      const rawAmt = cols[idxAmt] ?? "";
      const amt = Number(rawAmt.replace(/[^\d.-]/g, "") || 0);
      const colIdxRaw = idxCol >= 0 ? Number(cols[idxCol]) : NaN;
      const targetCol = Number.isFinite(colIdxRaw) && colIdxRaw >= 0 && colIdxRaw < templateColumns.length
        ? colIdxRaw : lastColDefault;
      if (!fName) continue;
      let matched = false;
      for (const gk of GROUP_KEYS) {
        for (const f of next[gk]) {
          if (f.name.toLowerCase() === fName.toLowerCase()) {
            const descNorm = (iDesc || "").trim().toLowerCase();
            // Special header rows
            if (descNorm === "s/no" || descNorm === "sno" || descNorm === "s/no.") {
              if (!Array.isArray(f.snos)) f.snos = templateColumns.map(() => "");
              f.snos[targetCol] = (rawAmt || "").trim();
              matched = true;
              continue;
            }
            if (descNorm === "provision") {
              if (!Array.isArray(f.provisions)) f.provisions = templateColumns.map(() => 0);
              f.provisions[targetCol] = amt;
              matched = true;
              continue;
            }
            const item = f.items.find(it =>
              (iCode && (it.code || "").toLowerCase() === iCode.toLowerCase()) ||
              (iDesc && it.desc.toLowerCase() === iDesc.toLowerCase())
            );
            if (item) {
              if (!Array.isArray(item.amounts)) item.amounts = templateColumns.map(() => null);
              item.amounts[targetCol] = amt;
              matched = true;
            }
            else if (!iDesc && !iCode) { matched = true; }
          }
        }
      }
      if (!matched) unmatchedRows.push(`${fName} | ${iDesc || iCode}`);
    }
    setData(next);
    setUnmatched(unmatchedRows);
    toast.success(`Imported. ${unmatchedRows.length} row(s) unmatched.`);
  };

  const save = () => {
    if (!periodId.trim() || !label.trim()) { toast.error("Provide a period id (e.g. 2026-05) and label."); return; }
    onSave(periodId.trim(), label.trim(), templateColumns, data);
  };

  const saveDraft = () => {
    if (!onSaveDraft) return;
    onSaveDraft(periodId.trim() || "(draft)", label.trim() || "(unsaved draft)", templateColumns, data);
  };

  const updateAmount = (gk: ZoneGroupKey, fi: number, ii: number, ci: number, value: string) => {
    setData(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as ZoneGroups;
      const n = value === "" ? null : Number(value);
      const item = next[gk][fi].items[ii];
      if (!Array.isArray(item.amounts)) item.amounts = templateColumns.map(() => null);
      item.amounts[ci] = Number.isFinite(n as number) ? (n as number) : null;
      return next;
    });
  };

  const updateSno = (gk: ZoneGroupKey, fi: number, ci: number, value: string) => {
    setData(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as ZoneGroups;
      const f = next[gk][fi];
      if (!Array.isArray(f.snos)) f.snos = templateColumns.map(() => "");
      f.snos[ci] = value;
      return next;
    });
  };

  const updateProvision = (gk: ZoneGroupKey, fi: number, ci: number, value: string) => {
    setData(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as ZoneGroups;
      const f = next[gk][fi];
      if (!Array.isArray(f.provisions)) f.provisions = templateColumns.map(() => 0);
      const n = Number(value);
      f.provisions[ci] = Number.isFinite(n) ? n : 0;
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle>Add bi-monthly period</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px]">Period id (sortable)</Label>
            <Input value={periodId} onChange={e => setPeriodId(e.target.value)} placeholder="e.g. 2026-05" className="h-9 mt-1" />
          </div>
          <div>
            <Label className="text-[11px]">Period label</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. May–Jun 2026" className="h-9 mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <label className="inline-flex items-center gap-2 text-[12px] cursor-pointer">
            <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1">
              <Upload className="h-3.5 w-3.5" /> Upload CSV/XLSX
            </span>
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleCsv(f); }} />
          </label>
          <span className="text-[11px] text-muted-foreground">
            Columns: Formation Name, Item of Expenditure, Code, Amount. To set the S/No header use Item = "S/No"; for the PROVISION row use Item = "PROVISION". Column index (0-based) optional via a "Column" column; defaults to the last column.
          </span>
        </div>
        {unmatched.length > 0 && (
          <div className="text-[11px] text-destructive max-h-20 overflow-y-auto border border-destructive/30 rounded p-2">
            Unmatched: {unmatched.slice(0, 10).join("; ")}{unmatched.length > 10 ? ` … +${unmatched.length - 10} more` : ""}
          </div>
        )}
        <div className="overflow-y-auto flex-1 border border-border rounded">
          {GROUP_KEYS.map(gk => (
            <div key={gk}>
              <div className="bg-muted/40 px-3 py-1.5 font-semibold text-[12px] sticky top-0">{ZONE_GROUP_LABELS[gk]}</div>
              {data[gk]?.map((f, fi) => (
                <div key={fi} className="border-t border-border">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="px-2 py-1.5 text-center font-semibold text-[12px] uppercase tracking-wide" colSpan={3}>
                          {f.name}
                        </th>
                        {templateColumns.map((_, ci) => (
                          <th key={ci} className="px-2 py-1 w-32">
                            <Input
                              value={f.snos?.[ci] ?? ""}
                              onChange={e => updateSno(gk, fi, ci, e.target.value)}
                              className="h-7 text-center font-semibold"
                              placeholder="S/No. 43(a)"
                            />
                          </th>
                        ))}
                      </tr>
                      <tr className="bg-muted/20">
                        <th className="px-2 py-1 text-right font-semibold text-[11px]" colSpan={3}>
                          PROVISION:&nbsp;&nbsp;=N=
                        </th>
                        {templateColumns.map((_, ci) => (
                          <th key={ci} className="px-2 py-1 w-32">
                            <Input
                              type="number" step="0.01"
                              value={f.provisions?.[ci] ?? 0}
                              onChange={e => updateProvision(gk, fi, ci, e.target.value)}
                              className="h-7 text-right tabular-nums font-semibold"
                            />
                          </th>
                        ))}
                      </tr>
                      <tr className="text-left bg-muted/10">
                        <th className="px-2 py-1 w-10">S/No.</th>
                        <th className="px-2 py-1">Item of Expenditure</th>
                        <th className="px-2 py-1 w-24">Code</th>
                        {templateColumns.map((_, ci) => (
                          <th key={ci} className="px-2 py-1 w-32 text-right">Amount =N=</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {f.items.map((it, ii) => (
                        <tr key={ii} className="border-t border-border">
                          <td className="px-2 py-1 w-10">{it.sno ?? ""}</td>
                          <td className="px-2 py-1">{it.desc}</td>
                          <td className="px-2 py-1 w-24"><BudgetCode code={it.code} /></td>
                          {templateColumns.map((_, ci) => (
                            <td key={ci} className="px-2 py-1 w-32">
                              <Input
                                type="number" step="0.01"
                                value={it.amounts?.[ci] ?? ""}
                                onChange={e => updateAmount(gk, fi, ii, ci, e.target.value)}
                                className="h-7 text-right tabular-nums"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {onSaveDraft && <Button variant="outline" onClick={saveDraft}>Save as Draft</Button>}
          <Button onClick={save}>Save period</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function cloneZeroed(src: ZoneGroups | undefined, nCols: number): ZoneGroups {
  const base: ZoneGroups = { zone1_6: [], zone7_12: [], zone13_17: [] };
  if (!src) return base;
  for (const gk of GROUP_KEYS) {
    base[gk] = (src[gk] || []).map(f => ({
      ...f,
      provision: 0,
      // Preserve S/No labels from template so the structure mirrors the current period;
      // user can edit them in the dialog if needed.
      snos: Array.from({ length: nCols }, (_, i) => (f.snos && f.snos[i]) || ""),
      provisions: Array.from({ length: nCols }, () => 0),
      totals: Array.from({ length: nCols }, () => 0),
      items: f.items.map(it => ({ sno: it.sno, desc: it.desc, code: it.code, amounts: Array.from({ length: nCols }, () => null as number | null) })),
    }));
  }
  return base;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (c === "," && !inQ) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}