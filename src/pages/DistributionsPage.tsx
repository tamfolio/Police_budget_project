import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Check, ChevronDown, ChevronRight, Pencil, Plus, RefreshCcw, Send, Trash2, Undo2, History, Database, Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BudgetCode } from "@/components/BudgetCode";
import { ApiError } from "@/lib/apiClient";
import {
  approveDistributionPeriod,
  createDistributionPeriod,
  deleteDistributionPeriod,
  getDistributionAuditTrail,
  getDistributionTemplate,
  listDistributionPeriods,
  returnDistributionPeriod,
  reviewDistributionPeriod,
  seedAllDistributions,
  submitDistributionPeriod,
  updateDistributionPeriod,
  type DistributionAuditEntry,
  type DistributionPayload,
  type DistributionSimplePeriod,
  type DistributionSummaryPeriod,
  type DistributionView,
  type DistributionZoneGroups,
  type DistributionZonePeriod,
} from "@/lib/distributionsApi";

const VIEWS: { key: DistributionView; label: string }[] = [
  { key: "zone", label: "Zone" },
  { key: "formations", label: "Formations" },
  { key: "schools", label: "Schools" },
  { key: "summary", label: "Summary" },
];

const fmtN = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

function apiErrorMessage(e: unknown, fallback: string) {
  if (e instanceof ApiError) return e.message || fallback;
  if (e instanceof Error) return e.message;
  return fallback;
}

export default function DistributionsPage() {
  const [view, setView] = useState<DistributionView>("zone");

  useEffect(() => { document.title = "Distributions – NPF BMS"; }, []);

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Distributions</h1>
          <p className="text-[12px] text-muted-foreground">
            Bi-monthly distribution periods across Zone, Formations, Schools, and Summary tabs — synced with the PAB Digital System.
          </p>
        </div>
        <SeedAllButton />
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as DistributionView)}>
        <TabsList>
          {VIEWS.map(v => (
            <TabsTrigger key={v.key} value={v.key}>{v.label}</TabsTrigger>
          ))}
        </TabsList>
        {VIEWS.map(v => (
          <TabsContent key={v.key} value={v.key} className="mt-3">
            {view === v.key && <DistributionViewPanel view={v.key} />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ─── Seed-all admin action ────────────────────────────────────────────────────
function SeedAllButton() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("SYSADMIN") || hasRole("BUDGET_DIR");
  const [busy, setBusy] = useState(false);
  if (!isAdmin) return null;
  const run = async () => {
    if (!confirm("Seed reference data and starter periods? Existing seeded rows will be reset.")) return;
    setBusy(true);
    try {
      await seedAllDistributions();
      toast.success("Reference data seeded.");
      window.dispatchEvent(new CustomEvent("distributions:refresh"));
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to seed data."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button size="sm" variant="outline" onClick={run} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Database className="h-4 w-4 mr-1" />}
      Seed reference data
    </Button>
  );
}

// ─── Per-view panel ───────────────────────────────────────────────────────────
function DistributionViewPanel({ view }: { view: DistributionView }) {
  const { hasRole } = useAuth();
  const isClk = hasRole("BUDGET_CLK") || hasRole("SYSADMIN");
  const isOff = hasRole("BUDGET_OFF") || hasRole("SYSADMIN");
  const isDir = hasRole("BUDGET_DIR") || hasRole("SYSADMIN");

  const [periods, setPeriods] = useState<DistributionPayload[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitial, setEditorInitial] = useState<DistributionPayload | null>(null);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");

  const [trailOpen, setTrailOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listDistributionPeriods(view);
      setPeriods(list);
      setActiveId(prev => {
        if (prev && list.some(p => p.id === prev)) return prev;
        return list[list.length - 1]?.id ?? "";
      });
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to load distribution periods."));
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const on = () => refresh();
    window.addEventListener("distributions:refresh", on);
    return () => window.removeEventListener("distributions:refresh", on);
  }, [refresh]);

  const active = useMemo(
    () => periods.find(p => p.id === activeId) ?? periods[periods.length - 1] ?? null,
    [periods, activeId],
  );

  // Status is not part of the payload schema — display as Unknown if absent.
  const status = ((active as unknown as { status?: string } | null)?.status ?? "—").toString();

  const openCreate = async () => {
    setEditorMode("create");
    try {
      const tpl = await getDistributionTemplate<DistributionPayload>(view);
      setEditorInitial(tpl);
    } catch (e) {
      // Fall back to active period structure if template fails.
      setEditorInitial(active);
      toast.message(apiErrorMessage(e, "Template unavailable — using current period as starting point."));
    }
    setEditorOpen(true);
  };

  const openEdit = () => {
    if (!active) return;
    setEditorMode("edit");
    setEditorInitial(active);
    setEditorOpen(true);
  };

  const saveEditor = async (payload: DistributionPayload) => {
    try {
      if (editorMode === "create") {
        await createDistributionPeriod(view, payload);
        toast.success(`Period "${payload.label}" created.`);
      } else {
        await updateDistributionPeriod(view, payload.id, payload);
        toast.success(`Period "${payload.label}" updated.`);
      }
      setEditorOpen(false);
      setEditorInitial(null);
      setActiveId(payload.id);
      await refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Save failed."));
    }
  };

  const doDelete = async () => {
    if (!active) return;
    if (!confirm(`Delete period "${active.label}"? This cannot be undone.`)) return;
    try {
      await deleteDistributionPeriod(view, active.id);
      toast.success("Period deleted.");
      await refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e, "Delete failed."));
    }
  };

  const doWorkflow = async (kind: "submit" | "review" | "approve") => {
    if (!active) return;
    try {
      if (kind === "submit") await submitDistributionPeriod(active.id);
      else if (kind === "review") await reviewDistributionPeriod(active.id);
      else await approveDistributionPeriod(active.id);
      toast.success(`Period ${kind}d.`);
      await refresh();
    } catch (e) {
      toast.error(apiErrorMessage(e, `${kind} failed.`));
    }
  };

  const doReturn = async (remarks: string) => {
    if (!active) return;
    try {
      await returnDistributionPeriod(active.id, remarks);
      toast.success("Period returned for correction.");
      setReturnOpen(false);
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
            <Label className="text-[11px] text-muted-foreground">Period</Label>
            <Select value={active?.id ?? ""} onValueChange={setActiveId}>
              <SelectTrigger className="h-9 w-[220px] mt-1">
                <SelectValue placeholder={loading ? "Loading…" : "No periods"} />
              </SelectTrigger>
              <SelectContent>
                {periods.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {active && status !== "—" && (
            <div>
              <Label className="text-[11px] text-muted-foreground">Status</Label>
              <div className="mt-1"><Badge variant="secondary">{status}</Badge></div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {active && (
            <Button size="sm" variant="outline" onClick={() => setTrailOpen(true)}>
              <History className="h-4 w-4 mr-1" />Audit
            </Button>
          )}
          {isClk && active && (
            <Button size="sm" variant="outline" onClick={openEdit}>
              <Pencil className="h-4 w-4 mr-1" />Edit
            </Button>
          )}
          {isClk && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />Add Period
            </Button>
          )}
          {isClk && active && (
            <Button size="sm" variant="outline" onClick={() => doWorkflow("submit")}>
              <Send className="h-4 w-4 mr-1" />Submit
            </Button>
          )}
          {isOff && active && (
            <Button size="sm" variant="outline" onClick={() => doWorkflow("review")}>
              <Check className="h-4 w-4 mr-1" />Review
            </Button>
          )}
          {isDir && active && (
            <Button size="sm" onClick={() => doWorkflow("approve")}>
              <Check className="h-4 w-4 mr-1" />Approve
            </Button>
          )}
          {(isOff || isDir) && active && (
            <Button size="sm" variant="outline" onClick={() => setReturnOpen(true)}>
              <Undo2 className="h-4 w-4 mr-1" />Return
            </Button>
          )}
          {isClk && active && (
            <Button size="sm" variant="destructive" onClick={doDelete}>
              <Trash2 className="h-4 w-4 mr-1" />Delete
            </Button>
          )}
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && !active && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No periods yet. {isClk ? "Click \"Add Period\" to create one." : "Ask a Budget Clerk to create one."}
          </CardContent>
        </Card>
      )}
      {active && view === "zone" && <ZoneViewTable period={active as DistributionZonePeriod} />}
      {active && (view === "formations" || view === "schools") && (
        <SimpleViewTable period={active as DistributionSimplePeriod} />
      )}
      {active && view === "summary" && <SummaryViewTable period={active as DistributionSummaryPeriod} />}

      {editorOpen && editorInitial && (
        <PeriodEditorDialog
          open={editorOpen}
          onClose={() => { setEditorOpen(false); setEditorInitial(null); }}
          mode={editorMode}
          view={view}
          initial={editorInitial}
          onSave={saveEditor}
        />
      )}

      {trailOpen && active && (
        <AuditTrailDialog
          open={trailOpen}
          onClose={() => setTrailOpen(false)}
          periodId={active.id}
          periodLabel={active.label}
        />
      )}

      {returnOpen && active && (
        <ReturnDialog
          open={returnOpen}
          onClose={() => setReturnOpen(false)}
          onConfirm={doReturn}
          periodLabel={active.label}
        />
      )}
    </div>
  );
}

// ─── Zone view renderer ───────────────────────────────────────────────────────
function ZoneViewTable({ period }: { period: DistributionZonePeriod }) {
  const groups: { key: keyof DistributionZonePeriod["data"]; label: string }[] = [
    { key: "zone1_6", label: "Zones 1–6" },
    { key: "zone7_12", label: "Zones 7–12" },
    { key: "zone13_17", label: "Zones 13–17" },
  ];
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    { zone1_6: true, zone7_12: true, zone13_17: true },
  );
  const [openForms, setOpenForms] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4">
      {groups.map(g => {
        const forms = period.data?.[g.key] ?? [];
        const gOpen = openGroups[g.key] ?? true;
        return (
          <Collapsible key={g.key} open={gOpen} onOpenChange={o => setOpenGroups(s => ({ ...s, [g.key]: o }))}>
            <Card>
              <CardHeader className="py-3">
                <CollapsibleTrigger asChild>
                  <button type="button" className="flex items-center gap-2 w-full text-left">
                    {gOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <CardTitle className="text-base">{g.label}</CardTitle>
                    <span className="ml-auto text-[11px] text-muted-foreground">{forms.length} formation{forms.length === 1 ? "" : "s"}</span>
                  </button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-3 pt-0">
                  {forms.length === 0 && <p className="text-xs text-muted-foreground">No formations.</p>}
                  {forms.map((f, idx) => {
                    const fKey = `${g.key}::${idx}`;
                    const fOpen = openForms[fKey] ?? true;
                    return (
                      <Collapsible key={fKey} open={fOpen} onOpenChange={o => setOpenForms(s => ({ ...s, [fKey]: o }))}>
                        <div className="rounded-md border border-border">
                          <CollapsibleTrigger asChild>
                            <button type="button" className="flex items-center gap-2 w-full text-left px-3 py-2 bg-muted/50 border-b border-border rounded-t-md hover:bg-muted/70 transition-colors">
                              {fOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                              <span className="text-[13px] font-semibold uppercase tracking-wide">{f.name}</span>
                              <span className="ml-auto text-[11px] text-muted-foreground shrink-0">Provision: <span className="tabular-nums text-foreground font-semibold">₦{fmtN(f.provision)}</span></span>
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="overflow-x-auto">
                              <table className="w-full text-[12px] border-separate border-spacing-0">
                                <thead>
                                  <tr className="text-left bg-muted/20">
                                    <th className="px-3 py-1.5 w-16">S/No.</th>
                                    <th className="px-3 py-1.5 min-w-[260px]">Item of Expenditure</th>
                                    <th className="px-3 py-1.5 w-28">Code</th>
                                    {period.columns.map((c, ci) => (
                                      <th key={ci} className="px-3 py-1.5 w-36 text-right">{c}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {f.items.map((it, i) => (
                                    <tr key={i} className="border-t border-border">
                                      <td className="px-3 py-1.5 w-16">{it.sno ?? ""}</td>
                                      <td className="px-3 py-1.5 min-w-[260px]">{it.desc}</td>
                                      <td className="px-3 py-1.5 w-28"><BudgetCode code={it.code} /></td>
                                      {period.columns.map((_, ci) => (
                                        <td key={ci} className="px-3 py-1.5 text-right tabular-nums">
                                          {it.amounts?.[ci] == null ? "" : fmtN(it.amounts[ci])}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                  <tr className="border-t border-border bg-muted/30 font-semibold">
                                    <td className="px-3 py-1.5" colSpan={3}>Total</td>
                                    {(f.totals ?? []).map((t, ci) => (
                                      <td key={ci} className="px-3 py-1.5 text-right tabular-nums">{fmtN(t)}</td>
                                    ))}
                                  </tr>
                                </tbody>
                              </table>
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
    </div>
  );
}

// ─── Simple view renderer (formations / schools) ──────────────────────────────
function SimpleViewTable({ period }: { period: DistributionSimplePeriod }) {
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({});

  return (
    <div className="space-y-3">
      {(period.sections ?? []).length === 0 && (
        <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">No sections.</CardContent></Card>
      )}
      {(period.sections ?? []).map((s, si) => {
        const sOpen = openSections[si] ?? true;
        const colTotals = period.columns.map((_, ci) => s.items.reduce((sum, it) => sum + (Number(it.amounts?.[ci]) || 0), 0));
        return (
          <Collapsible key={`${s.name}-${si}`} open={sOpen} onOpenChange={o => setOpenSections(prev => ({ ...prev, [si]: o }))}>
            <div className="rounded-md border border-border">
              <CollapsibleTrigger asChild>
                <button type="button" className="flex items-center gap-2 w-full text-left px-3 py-2 bg-muted/50 border-b border-border rounded-t-md hover:bg-muted/70 transition-colors">
                  {sOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold uppercase tracking-wide">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      PROVISION =N=
                      {(s.provisions ?? []).map((p, ci) => (
                        <span key={ci} className="ml-2 tabular-nums font-semibold text-foreground">
                          {fmtN(p)}{period.columns.length > 1 ? ` (${period.columns[ci]})` : ""}
                        </span>
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
                        {period.columns.map((c, ci) => (
                          <th key={ci} className="px-3 py-1.5 w-36 text-right">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.items.map((it, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-1.5 w-16">{it.sno ?? ""}</td>
                          <td className="px-3 py-1.5 min-w-[260px]">{it.desc}</td>
                          <td className="px-3 py-1.5 w-28"><BudgetCode code={it.code} /></td>
                          {period.columns.map((_, ci) => (
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
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}

// ─── Summary view renderer ────────────────────────────────────────────────────
function SummaryViewTable({ period }: { period: DistributionSummaryPeriod }) {
  const rows = period.rows ?? [];
  const totals = rows.reduce(
    (s, r) => ({
      allocation: s.allocation + (Number(r.allocation) || 0),
      fromDist: s.fromDist + (Number(r.fromDist) || 0),
    }),
    { allocation: 0, fromDist: 0 },
  );
  const diffTotal = totals.allocation - totals.fromDist;

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">All Commands and Formations <span className="text-muted-foreground font-normal text-[12px]">· {period.label}</span></CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full text-[12px] border-separate border-spacing-0">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-3 py-2 w-12">S/No.</th>
                <th className="px-3 py-2 min-w-[260px]">Commands/Formations</th>
                <th className="px-3 py-2 text-right">Allocation (₦)</th>
                <th className="px-3 py-2 text-right">From Distribution (₦)</th>
                <th className="px-3 py-2 text-right">Difference (₦)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const diff = (Number(r.allocation) || 0) - (Number(r.fromDist) || 0);
                return (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-1.5 w-12">{i + 1}</td>
                    <td className="px-3 py-1.5 min-w-[260px]">{r.name}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtN(r.allocation)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtN(r.fromDist)}</td>
                    <td className={`px-3 py-1.5 text-right tabular-nums font-medium ${diff < 0 ? "text-red-600" : "text-emerald-600"}`}>{fmtN(diff)}</td>
                  </tr>
                );
              })}
              <tr className="border-t border-border bg-muted/40 font-semibold">
                <td className="px-3 py-1.5" colSpan={2}>Total</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmtN(totals.allocation)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmtN(totals.fromDist)}</td>
                <td className={`px-3 py-1.5 text-right tabular-nums ${diffTotal < 0 ? "text-red-600" : "text-emerald-600"}`}>{fmtN(diffTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Period editor dialog (structured form) ───────────────────────────────────
function PeriodEditorDialog({
  open, onClose, mode, view, initial, onSave,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  view: DistributionView;
  initial: DistributionPayload;
  onSave: (p: DistributionPayload) => void | Promise<void>;
}) {
  const [id, setId] = useState(initial.id);
  const [label, setLabel] = useState(initial.label);
  const [payload, setPayload] = useState<DistributionPayload>(() => JSON.parse(JSON.stringify(initial)));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setId(initial.id);
    setLabel(initial.label);
    const clone: DistributionPayload = JSON.parse(JSON.stringify(initial));
    if (view !== "summary") {
      const p = clone as DistributionZonePeriod | DistributionSimplePeriod;
      const cols = p.columns ?? [];
      p.columns = [cols[0] ?? "", cols[1] ?? ""];
    }
    setPayload(clone);
  }, [initial, view]);

  const submit = async () => {
    if (!id.trim() || !label.trim()) { toast.error("Period id and label are required."); return; }
    if (view !== "summary") {
      const cols = (payload as DistributionZonePeriod | DistributionSimplePeriod).columns ?? [];
      if (cols.length !== 2 || !cols[0].trim() || !cols[1].trim()) {
        toast.error("Distributions are bi-monthly — exactly 2 non-empty column headers are required.");
        return;
      }
    }
    const final = { ...payload, id: id.trim(), label: label.trim() } as DistributionPayload;
    setBusy(true);
    try { await onSave(final); } finally { setBusy(false); }
  };

  const setColumns = (cols: string[]) =>
    setPayload(p => ({ ...p, columns: cols } as DistributionPayload));

  const updateZoneAmount = (group: keyof DistributionZoneGroups, fIdx: number, iIdx: number, colIdx: number, val: number) =>
    setPayload(prev => {
      const p: DistributionZonePeriod = JSON.parse(JSON.stringify(prev));
      p.data[group][fIdx].items[iIdx].amounts[colIdx] = val;
      p.data[group][fIdx].totals = p.data[group][fIdx].items.reduce((acc, it) => {
        it.amounts.forEach((a, ci) => { acc[ci] = (acc[ci] || 0) + (Number(a) || 0); });
        return acc;
      }, [] as number[]);
      return p;
    });

  const updateZoneProvision = (group: keyof DistributionZoneGroups, fIdx: number, val: number) =>
    setPayload(prev => {
      const p: DistributionZonePeriod = JSON.parse(JSON.stringify(prev));
      p.data[group][fIdx].provision = val;
      return p;
    });

  const updateSimpleAmount = (sIdx: number, iIdx: number, colIdx: number, val: number) =>
    setPayload(prev => {
      const p: DistributionSimplePeriod = JSON.parse(JSON.stringify(prev));
      p.sections[sIdx].items[iIdx].amounts[colIdx] = val;
      return p;
    });

  const updateSimpleProvision = (sIdx: number, colIdx: number, val: number) =>
    setPayload(prev => {
      const p: DistributionSimplePeriod = JSON.parse(JSON.stringify(prev));
      if (!p.sections[sIdx].provisions) p.sections[sIdx].provisions = [];
      p.sections[sIdx].provisions[colIdx] = val;
      return p;
    });

  const updateSummaryRow = (rIdx: number, field: "allocation" | "fromDist", val: number) =>
    setPayload(prev => {
      const p: DistributionSummaryPeriod = JSON.parse(JSON.stringify(prev));
      p.rows[rIdx][field] = val;
      return p;
    });

  const columns = (payload as DistributionZonePeriod | DistributionSimplePeriod).columns ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add" : "Edit"} {view} period</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div>
            <Label className="text-[11px]">Period ID</Label>
            <Input value={id} onChange={e => setId(e.target.value)} placeholder="e.g. 2026-01" className="h-9 mt-1" disabled={mode === "edit"} />
          </div>
          <div>
            <Label className="text-[11px]">Period label</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Jan–Feb 2026" className="h-9 mt-1" />
          </div>
        </div>

        {view !== "summary" && (
          <div className="shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <Label className="text-[11px]">Column headers</Label>
              <span className="text-[10px] text-muted-foreground">(bi-monthly — 2 months required)</span>
            </div>
            <div className="flex gap-2">
              {[0, 1].map(ci => (
                <div key={ci} className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground">Month {ci + 1}</span>
                  <Input
                    value={columns[ci] ?? ""}
                    onChange={e => {
                      const cols: string[] = [columns[0] ?? "", columns[1] ?? ""];
                      cols[ci] = e.target.value;
                      setColumns(cols);
                    }}
                    placeholder={ci === 0 ? "e.g. January" : "e.g. February"}
                    className="h-8 text-[12px] w-44"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto mt-1 pr-1 space-y-1">
          {view === "zone" && (
            <ZoneFormEditor
              period={payload as DistributionZonePeriod}
              onAmountChange={updateZoneAmount}
              onProvisionChange={updateZoneProvision}
            />
          )}
          {(view === "formations" || view === "schools") && (
            <SimpleFormEditor
              period={payload as DistributionSimplePeriod}
              onAmountChange={updateSimpleAmount}
              onProvisionChange={updateSimpleProvision}
            />
          )}
          {view === "summary" && (
            <SummaryFormEditor
              period={payload as DistributionSummaryPeriod}
              onRowChange={updateSummaryRow}
            />
          )}
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {mode === "create" ? "Create period" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Zone form editor ─────────────────────────────────────────────────────────
function ZoneFormEditor({
  period, onAmountChange, onProvisionChange,
}: {
  period: DistributionZonePeriod;
  onAmountChange: (group: keyof DistributionZoneGroups, fIdx: number, iIdx: number, colIdx: number, val: number) => void;
  onProvisionChange: (group: keyof DistributionZoneGroups, fIdx: number, val: number) => void;
}) {
  const groups: { key: keyof DistributionZoneGroups; label: string }[] = [
    { key: "zone1_6", label: "Zones 1–6" },
    { key: "zone7_12", label: "Zones 7–12" },
    { key: "zone13_17", label: "Zones 13–17" },
  ];
  return (
    <div className="space-y-5">
      {groups.map(g => {
        const formations = period.data?.[g.key] ?? [];
        return (
          <div key={g.key}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{g.label}</p>
            <div className="space-y-3">
              {formations.map((f, fIdx) => (
                <div key={fIdx} className="rounded-md border border-border">
                  <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-muted/40 border-b border-border">
                    <span className="text-[13px] font-semibold flex-1 uppercase tracking-wide">{f.name}</span>
                    <div className="flex items-center gap-2">
                      <Label className="text-[11px] text-muted-foreground">Provision</Label>
                      <Input
                        type="number"
                        value={f.provision ?? 0}
                        onChange={e => onProvisionChange(g.key, fIdx, Number(e.target.value))}
                        className="h-7 w-40 text-[12px] text-right tabular-nums"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead className="bg-muted/20">
                        <tr>
                          <th className="px-2 py-1 text-left w-12 text-[11px]">S/No.</th>
                          <th className="px-2 py-1 text-left min-w-[200px] text-[11px]">Item of Expenditure</th>
                          <th className="px-2 py-1 text-left w-24 text-[11px]">Code</th>
                          {period.columns.map((c, ci) => (
                            <th key={ci} className="px-2 py-1 text-right w-40 text-[11px]">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {f.items.map((it, iIdx) => (
                          <tr key={iIdx} className="border-t border-border">
                            <td className="px-2 py-1 text-muted-foreground">{it.sno ?? ""}</td>
                            <td className="px-2 py-1">{it.desc}</td>
                            <td className="px-2 py-1"><BudgetCode code={it.code} /></td>
                            {period.columns.map((_, ci) => (
                              <td key={ci} className="px-2 py-1">
                                <Input
                                  type="number"
                                  value={it.amounts?.[ci] ?? 0}
                                  onChange={e => onAmountChange(g.key, fIdx, iIdx, ci, Number(e.target.value))}
                                  className="h-7 text-[12px] text-right tabular-nums w-full"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                        <tr className="border-t border-border bg-muted/20 font-semibold">
                          <td className="px-2 py-1" colSpan={3}>Total</td>
                          {(f.totals ?? []).map((t, ci) => (
                            <td key={ci} className="px-2 py-1 text-right tabular-nums">{fmtN(t)}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {formations.length === 0 && <p className="text-[12px] text-muted-foreground">No formations in this group.</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Simple form editor (formations / schools) ────────────────────────────────
function SimpleFormEditor({
  period, onAmountChange, onProvisionChange,
}: {
  period: DistributionSimplePeriod;
  onAmountChange: (sIdx: number, iIdx: number, colIdx: number, val: number) => void;
  onProvisionChange: (sIdx: number, colIdx: number, val: number) => void;
}) {
  return (
    <div className="space-y-4">
      {(period.sections ?? []).map((s, sIdx) => (
        <div key={sIdx} className="rounded-md border border-border">
          <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-muted/40 border-b border-border">
            <span className="text-[13px] font-semibold flex-1 uppercase tracking-wide">{s.name}</span>
            {period.columns.map((c, ci) => (
              <div key={ci} className="flex items-center gap-2">
                <Label className="text-[11px] text-muted-foreground whitespace-nowrap">
                  Provision{period.columns.length > 1 ? ` (${c})` : ""}
                </Label>
                <Input
                  type="number"
                  value={s.provisions?.[ci] ?? 0}
                  onChange={e => onProvisionChange(sIdx, ci, Number(e.target.value))}
                  className="h-7 w-40 text-[12px] text-right tabular-nums"
                />
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/20">
                <tr>
                  <th className="px-2 py-1 text-left w-12 text-[11px]">S/No.</th>
                  <th className="px-2 py-1 text-left min-w-[200px] text-[11px]">Items of Expenditure</th>
                  <th className="px-2 py-1 text-left w-24 text-[11px]">Code</th>
                  {period.columns.map((c, ci) => (
                    <th key={ci} className="px-2 py-1 text-right w-40 text-[11px]">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.items.map((it, iIdx) => (
                  <tr key={iIdx} className="border-t border-border">
                    <td className="px-2 py-1 text-muted-foreground">{it.sno ?? ""}</td>
                    <td className="px-2 py-1">{it.desc}</td>
                    <td className="px-2 py-1"><BudgetCode code={it.code} /></td>
                    {period.columns.map((_, ci) => (
                      <td key={ci} className="px-2 py-1">
                        <Input
                          type="number"
                          value={it.amounts?.[ci] ?? 0}
                          onChange={e => onAmountChange(sIdx, iIdx, ci, Number(e.target.value))}
                          className="h-7 text-[12px] text-right tabular-nums w-full"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {(period.sections ?? []).length === 0 && (
        <p className="text-[12px] text-muted-foreground">No sections found in template.</p>
      )}
    </div>
  );
}

// ─── Summary form editor ──────────────────────────────────────────────────────
function SummaryFormEditor({
  period, onRowChange,
}: {
  period: DistributionSummaryPeriod;
  onRowChange: (rIdx: number, field: "allocation" | "fromDist", val: number) => void;
}) {
  const rows = period.rows ?? [];
  return (
    <div className="rounded-md border border-border overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-3 py-2 text-left w-12 text-[11px]">S/No.</th>
            <th className="px-3 py-2 text-left min-w-[220px] text-[11px]">Commands/Formations</th>
            <th className="px-3 py-2 text-right w-48 text-[11px]">Allocation (₦)</th>
            <th className="px-3 py-2 text-right w-48 text-[11px]">From Distribution (₦)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, rIdx) => (
            <tr key={rIdx} className="border-t border-border">
              <td className="px-3 py-1 text-muted-foreground">{rIdx + 1}</td>
              <td className="px-3 py-1">{r.name}</td>
              <td className="px-3 py-1">
                <Input
                  type="number"
                  value={r.allocation ?? 0}
                  onChange={e => onRowChange(rIdx, "allocation", Number(e.target.value))}
                  className="h-7 text-[12px] text-right tabular-nums w-full"
                />
              </td>
              <td className="px-3 py-1">
                <Input
                  type="number"
                  value={r.fromDist ?? 0}
                  onChange={e => onRowChange(rIdx, "fromDist", Number(e.target.value))}
                  className="h-7 text-[12px] text-right tabular-nums w-full"
                />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">No rows found in template.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Audit trail dialog ───────────────────────────────────────────────────────
function AuditTrailDialog({
  open, onClose, periodId, periodLabel,
}: { open: boolean; onClose: () => void; periodId: string; periodLabel: string }) {
  const [entries, setEntries] = useState<DistributionAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDistributionAuditTrail(periodId)
      .then(rows => { if (!cancelled) setEntries(rows); })
      .catch(e => { if (!cancelled) toast.error(apiErrorMessage(e, "Failed to load audit trail.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [periodId]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Audit trail — {periodLabel}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && entries.length === 0 && <p className="text-sm text-muted-foreground">No actions recorded.</p>}
          {!loading && entries.length > 0 && (
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-1.5">When</th>
                  <th className="px-3 py-1.5">Action</th>
                  <th className="px-3 py-1.5">Actor</th>
                  <th className="px-3 py-1.5">Remarks</th>
                </tr>
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
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Return dialog ────────────────────────────────────────────────────────────
function ReturnDialog({
  open, onClose, onConfirm, periodLabel,
}: { open: boolean; onClose: () => void; onConfirm: (remarks: string) => void | Promise<void>; periodLabel: string }) {
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setRemarks(""); }, [open]);
  const submit = async () => {
    if (remarks.trim().length < 3) { toast.error("Remarks must be at least 3 characters."); return; }
    setBusy(true);
    try { await onConfirm(remarks.trim()); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return {periodLabel} for correction</DialogTitle>
          <DialogDescription>Provide remarks explaining what needs to be corrected. Required, 3–1000 characters.</DialogDescription>
        </DialogHeader>
        <Textarea
          value={remarks}
          onChange={e => setRemarks(e.target.value)}
          placeholder="e.g. Please correct the allocation figures for Zone 3."
          maxLength={1000}
          rows={5}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}