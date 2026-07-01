import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Upload, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { BudgetCode } from "@/components/BudgetCode";
import type { SimplePeriod, SimpleSection } from "@/data/formationAllocations";
import { cloneZeroedSections, makeStore } from "@/lib/simpleAllocationsStore";
import { isTotalRow } from "@/lib/distributionAggregation";

const fmtN = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

export default function SimpleAllocationsView({
  storageKey, eventName, seed, emptyLabel,
}: { storageKey: string; eventName: string; seed: SimplePeriod[]; emptyLabel?: string }) {
  const store = useMemo(() => makeStore(storageKey, eventName, seed), [storageKey, eventName, seed]);
  const [periods, setPeriods] = useState<SimplePeriod[]>(() => store.load());
  const [activeId, setActiveId] = useState<string>(() => store.load().slice(-1)[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [dlgOpen, setDlgOpen] = useState(false);
  const [editMode, setEditMode] = useState<SimplePeriod | null>(null);
  const collapseKey = `${storageKey}:sectionsOpen`;
  const [sectionsOpen, setSectionsOpen] = useState<boolean>(() => {
    try { const raw = localStorage.getItem(collapseKey); return raw === null ? true : raw === "1"; }
    catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem(collapseKey, sectionsOpen ? "1" : "0"); } catch {}
  }, [sectionsOpen, collapseKey]);

  const perSectionKey = `${storageKey}:sectionOpenMap`;
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    try { const raw = localStorage.getItem(perSectionKey); return raw ? JSON.parse(raw) : {}; }
    catch { return {}; }
  });
  useEffect(() => {
    try { localStorage.setItem(perSectionKey, JSON.stringify(openMap)); } catch {}
  }, [openMap, perSectionKey]);
  const isSectionOpen = (name: string) => openMap[name] !== false;
  const toggleSection = (name: string, open: boolean) =>
    setOpenMap(prev => ({ ...prev, [name]: open }));

  useEffect(() => { store.save(periods); }, [periods, store]);
  useEffect(() => {
    return store.subscribe(() => {
      const next = store.load();
      setPeriods(prev => JSON.stringify(prev) === JSON.stringify(next) ? prev : next);
    });
  }, [store]);

  const active = useMemo(
    () => periods.find(p => p.id === activeId) ?? periods[periods.length - 1],
    [periods, activeId]
  );

  const filtered = useMemo(() => {
    if (!active) return [];
    if (!search.trim()) return active.sections;
    const q = search.toLowerCase();
    return active.sections.filter(
      s => s.name.toLowerCase().includes(q)
        || s.items.some(i => i.desc.toLowerCase().includes(q) || (i.code || "").toLowerCase().includes(q))
    );
  }, [active, search]);

  const handleSave = (id: string, label: string, columns: string[], sections: SimpleSection[]) => {
    setPeriods(prev => {
      const others = prev.filter(p => p.id !== id);
      return [...others, { id, label, columns, sections }].sort((a, b) => a.id.localeCompare(b.id));
    });
    setActiveId(id);
    setDlgOpen(false);
    setEditMode(null);
    toast.success(`Period "${label}" saved.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">Bi-monthly period</Label>
            <Select value={active?.id ?? ""} onValueChange={setActiveId}>
              <SelectTrigger className="h-9 w-[200px] mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {periods.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Search formation / item</Label>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="e.g. Lagos, Stationery, 0301" className="h-9 w-[260px] mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {active && (
            <Button size="sm" variant="outline" onClick={() => { setEditMode(active); setDlgOpen(true); }}>
              Edit period
            </Button>
          )}
          <Button size="sm" onClick={() => { setEditMode(null); setDlgOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />Add Period
          </Button>
        </div>
      </div>

      {!active && <p className="text-sm text-muted-foreground">{emptyLabel ?? "No periods yet. Click \"Add Period\" to begin."}</p>}

      {active && filtered.length === 0 && (
        <p className="text-xs text-muted-foreground">No sections match your search.</p>
      )}

      {active && filtered.length > 0 && (
        <Collapsible open={sectionsOpen} onOpenChange={setSectionsOpen}>
          <div className="rounded-md border border-border bg-muted/10">
            <CollapsibleTrigger asChild>
              <button type="button" className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-muted/30 rounded-md">
                {sectionsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="text-[12.5px] font-semibold uppercase tracking-wide">All Sections</span>
                <span className="ml-auto text-[11px] text-muted-foreground">{filtered.length} section{filtered.length === 1 ? "" : "s"}</span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-3 p-3 pt-0">
                {filtered.map((s, si) => (
                  <SectionTable
                    key={`${s.name}-${si}`}
                    section={s}
                    columns={active.columns}
                    open={isSectionOpen(s.name)}
                    onOpenChange={(o) => toggleSection(s.name, o)}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      <AddPeriodDialog
        open={dlgOpen}
        onClose={() => { setDlgOpen(false); setEditMode(null); }}
        existingPeriods={periods}
        onSave={handleSave}
        initialEdit={editMode ?? undefined}
      />
    </div>
  );
}

function SectionTable({ section, columns, open, onOpenChange }: { section: SimpleSection; columns: string[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const colTotals = columns.map((_, ci) => section.items.reduce((s, i) => isTotalRow(i) ? s : s + (Number(i.amounts?.[ci]) || 0), 0));
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="rounded-md border border-border">
      <CollapsibleTrigger asChild>
        <button type="button" className="w-full text-left px-3 py-2 bg-muted/50 border-b border-border hover:bg-muted/70 flex items-start gap-2">
          {open ? <ChevronDown className="h-4 w-4 mt-0.5 shrink-0" /> : <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />}
          <div className="flex-1">
            <div className="text-[13px] font-semibold uppercase tracking-wide">{section.name}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              PROVISION: =N= {section.provisions.map((p, ci) => (
                <span key={ci} className="ml-2 tabular-nums font-semibold text-foreground">{fmtN(p)}{columns.length > 1 ? ` (${columns[ci]})` : ""}</span>
              ))}
            </div>
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] border-separate border-spacing-0">
          <thead>
            <tr className="text-left bg-muted/20">
              <th className="px-3 py-1.5 w-16">S/No.</th>
              <th className="px-3 py-1.5 min-w-[260px]">Items of Expenditure</th>
              <th className="px-3 py-1.5 w-28">Code</th>
              {columns.map((c, ci) => (
                <th key={ci} className="px-3 py-1.5 w-40 text-right">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.items.map((it, i) => (
              <tr key={i} className="group border-t border-border">
                <td className="px-3 py-1.5 w-16">{it.sno ?? ""}</td>
                <td className="px-3 py-1.5 min-w-[260px]">{it.desc}</td>
                <td className="px-3 py-1.5 w-28"><BudgetCode code={it.code} /></td>
                {columns.map((_, ci) => (
                  <td key={ci} className="px-3 py-1.5 text-right tabular-nums">
                    {it.amounts?.[ci] == null ? "" : fmtN(it.amounts[ci])}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-border bg-muted/30 font-semibold">
              <td className="px-3 py-1.5" colSpan={3}>Total</td>
              {colTotals.map((t, ci) => (
                <td key={ci} className="px-3 py-1.5 text-right tabular-nums">{fmtN(t)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function AddPeriodDialog({
  open, onClose, existingPeriods, onSave, initialEdit,
}: {
  open: boolean; onClose: () => void; existingPeriods: SimplePeriod[];
  onSave: (id: string, label: string, columns: string[], sections: SimpleSection[]) => void;
  initialEdit?: SimplePeriod;
}) {
  const template = existingPeriods[existingPeriods.length - 1];
  const templateColumns = initialEdit?.columns ?? template?.columns ?? ["Amount (₦)"];
  const [periodId, setPeriodId] = useState("");
  const [label, setLabel] = useState("");
  const [sections, setSections] = useState<SimpleSection[]>(
    () => initialEdit ? JSON.parse(JSON.stringify(initialEdit.sections)) : cloneZeroedSections(template?.sections, templateColumns.length)
  );
  const [unmatched, setUnmatched] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    if (initialEdit) {
      setPeriodId(initialEdit.id);
      setLabel(initialEdit.label);
      setSections(JSON.parse(JSON.stringify(initialEdit.sections)));
    } else {
      setPeriodId("");
      setLabel("");
      setSections(cloneZeroedSections(template?.sections, templateColumns.length));
    }
  }, [open, initialEdit, template, templateColumns.length]);

  const updateAmount = (si: number, ii: number, ci: number, v: string) => {
    setSections(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as SimpleSection[];
      const n = v === "" ? null : Number(v);
      next[si].items[ii].amounts[ci] = Number.isFinite(n as number) ? (n as number) : null;
      return next;
    });
  };
  const updateProvision = (si: number, ci: number, v: string) => {
    setSections(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as SimpleSection[];
      const n = Number(v);
      next[si].provisions[ci] = Number.isFinite(n) ? n : 0;
      return next;
    });
  };

  const save = () => {
    if (!periodId.trim() || !label.trim()) { toast.error("Provide a period id and label."); return; }
    onSave(periodId.trim(), label.trim(), templateColumns, sections);
  };

  const handleUpload = async (file: File) => {
    const { parseUpload } = await import("@/lib/tableUpload");
    const all = await parseUpload(file);
    if (!all.length) return;
    const header = all.shift()!.map(h => h.trim().toLowerCase());
    const rows = all;
    const idxSection = header.findIndex(h => h.includes("section") || h.includes("formation") || h.includes("school"));
    const idxItem = header.findIndex(h => h.includes("item"));
    const idxCode = header.findIndex(h => h.includes("code"));
    const idxAmt = header.findIndex(h => h.includes("amount"));
    const idxCol = header.findIndex(h => h === "column" || h.includes("col index") || h === "col");
    if (idxSection < 0 || idxAmt < 0) {
      toast.error("File must include Section/Formation Name and Amount columns.");
      return;
    }
    const next = JSON.parse(JSON.stringify(sections)) as SimpleSection[];
    const lastColDefault = templateColumns.length - 1;
    const unmatchedRows: string[] = [];
    for (const cols of rows) {
      if (!cols || !cols.length) continue;
      const sName = cols[idxSection]?.trim();
      const iDesc = idxItem >= 0 ? cols[idxItem]?.trim() : "";
      const iCode = idxCode >= 0 ? cols[idxCode]?.trim() : "";
      const rawAmt = cols[idxAmt] ?? "";
      const amt = Number(String(rawAmt).replace(/[^\d.-]/g, "") || 0);
      const colIdxRaw = idxCol >= 0 ? Number(cols[idxCol]) : NaN;
      const targetCol = Number.isFinite(colIdxRaw) && colIdxRaw >= 0 && colIdxRaw < templateColumns.length
        ? colIdxRaw : lastColDefault;
      if (!sName) continue;
      const section = next.find(s => s.name.toLowerCase() === sName.toLowerCase());
      if (!section) { unmatchedRows.push(`${sName} | ${iDesc || iCode}`); continue; }
      const descNorm = (iDesc || "").trim().toLowerCase();
      if (descNorm === "provision") {
        if (!Array.isArray(section.provisions)) section.provisions = templateColumns.map(() => 0);
        section.provisions[targetCol] = amt;
        continue;
      }
      const item = section.items.find(it =>
        (iCode && (it.code || "").toLowerCase() === iCode.toLowerCase()) ||
        (iDesc && it.desc.toLowerCase() === iDesc.toLowerCase())
      );
      if (item) {
        if (!Array.isArray(item.amounts)) item.amounts = templateColumns.map(() => null);
        item.amounts[targetCol] = amt;
      } else if (iDesc || iCode) {
        unmatchedRows.push(`${sName} | ${iDesc || iCode}`);
      }
    }
    setSections(next);
    setUnmatched(unmatchedRows);
    toast.success(`Imported. ${unmatchedRows.length} row(s) unmatched.`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle>{initialEdit ? "Edit period" : "Add period"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px]">Period id (sortable)</Label>
            <Input value={periodId} onChange={e => setPeriodId(e.target.value)} placeholder="e.g. 2026-03" className="h-9 mt-1" disabled={!!initialEdit} />
          </div>
          <div>
            <Label className="text-[11px]">Period label</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. March–April 2026" className="h-9 mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <label className="inline-flex items-center gap-2 text-[12px] cursor-pointer">
            <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1">
              <Upload className="h-3.5 w-3.5" /> Upload CSV/XLSX
            </span>
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
          </label>
          <span className="text-[11px] text-muted-foreground">
            Columns: Section Name, Item of Expenditure, Code, Amount. For the PROVISION row use Item = "PROVISION". Column index (0-based) optional via a "Column" column; defaults to the last column.
          </span>
        </div>
        {unmatched.length > 0 && (
          <div className="text-[11px] text-destructive max-h-20 overflow-y-auto border border-destructive/30 rounded p-2">
            Unmatched: {unmatched.slice(0, 10).join("; ")}{unmatched.length > 10 ? ` … +${unmatched.length - 10} more` : ""}
          </div>
        )}
        <div className="overflow-y-auto flex-1 border border-border rounded mt-2">
          {sections.map((s, si) => (
            <div key={si} className="border-b border-border">
              <div className="bg-muted/40 px-3 py-1.5 font-semibold text-[12px]">{s.name}</div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-muted/20">
                    <th className="px-2 py-1 text-right" colSpan={3}>PROVISION =N=</th>
                    {templateColumns.map((_, ci) => (
                      <th key={ci} className="px-2 py-1 w-32">
                        <Input type="number" step="0.01"
                          value={s.provisions?.[ci] ?? 0}
                          onChange={e => updateProvision(si, ci, e.target.value)}
                          className="h-7 text-right tabular-nums font-semibold" />
                      </th>
                    ))}
                  </tr>
                  <tr className="text-left bg-muted/10">
                    <th className="px-2 py-1 w-10">S/No.</th>
                    <th className="px-2 py-1">Items of Expenditure</th>
                    <th className="px-2 py-1 w-24">Code</th>
                    {templateColumns.map((c, ci) => (
                      <th key={ci} className="px-2 py-1 w-32 text-right">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.items.map((it, ii) => (
                    <tr key={ii} className="border-t border-border">
                      <td className="px-2 py-1 w-10">{it.sno ?? ""}</td>
                      <td className="px-2 py-1">{it.desc}</td>
                      <td className="px-2 py-1 w-24"><BudgetCode code={it.code} /></td>
                      {templateColumns.map((_, ci) => (
                        <td key={ci} className="px-2 py-1 w-32">
                          <Input type="number" step="0.01"
                            value={it.amounts?.[ci] ?? ""}
                            onChange={e => updateAmount(si, ii, ci, e.target.value)}
                            className="h-7 text-right tabular-nums" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save period</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}