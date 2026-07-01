import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Send, Check, X, History, PlusCircle, FileDown, Trash2, RefreshCw, Calendar, Filter, ShieldCheck, AlertTriangle, Pencil } from "lucide-react";
import jsPDF from "jspdf";
import npfLogo from "@/assets/npf-logo.png";

type TxnStatus = "DRAFT" | "SUBMITTED" | "OFFICER_REVIEWED" | "APPROVED" | "RETURNED" | "CANCELLED";
type Period = {
  id: string; fiscal_year: number; period_month: number;
  opening_balance: number; total_inflows: number; total_expended: number;
  residual: number; percent_utilized: number; notes: string | null;
  status: TxnStatus; return_remarks: string | null;
  created_by: string; submitted_by: string | null; reviewed_by: string | null; approved_by: string | null;
  created_at: string; submitted_at: string | null; reviewed_at: string | null; approved_at: string | null;
};
type Line = {
  id: string; period_id: string; sub_item_code: string;
  opening_balance: number; inflows: number; expended: number; residual: number; percent_utilized: number;
};
type ApprovalAction = { id: string; record_id: string; actor: string; action: string; remarks: string | null; created_at: string };
type ProfileLite = { user_id: string; full_name: string | null; email: string | null };
type SubItem = { code: string; name: string; category_code: string };
type Category = { code: string; name: string };
type Recon = { inflowsActual: number; expendedActual: number; inflowsDiff: number; expendedDiff: number };

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const fmtN = (n: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(n || 0);
const STATUS_VARIANT: Record<TxnStatus, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline", SUBMITTED: "secondary", OFFICER_REVIEWED: "secondary",
  APPROVED: "default", RETURNED: "destructive", CANCELLED: "destructive",
};

export default function CarryOverPage() {
  const { user, hasRole } = useAuth();
  const isClk = hasRole("BUDGET_CLK");
  const isOff = hasRole("BUDGET_OFF");
  const isDir = hasRole("BUDGET_DIR");
  const isSys = hasRole("SYSADMIN");

  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [periods, setPeriods] = useState<Period[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);

  // filters
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterCode, setFilterCode] = useState<string>("ALL");
  const [subItems, setSubItems] = useState<SubItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // reconciliation
  const [recon, setRecon] = useState<Recon | null>(null);
  const [reconLoading, setReconLoading] = useState(false);

  // detail
  const [openId, setOpenId] = useState<string | null>(null);
  const openPeriod = useMemo(() => periods.find(p => p.id === openId) || null, [periods, openId]);
  const openLines = useMemo(() => lines.filter(l => l.period_id === openId).sort((a,b) => a.sub_item_code.localeCompare(b.sub_item_code)), [lines, openId]);
  const [actions, setActions] = useState<ApprovalAction[]>([]);

  // approval dialog
  const [actionRow, setActionRow] = useState<Period | null>(null);
  const [actionKind, setActionKind] = useState<"REVIEW" | "APPROVE" | "RETURN" | null>(null);
  const [remarks, setRemarks] = useState("");

  // create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [draftMonth, setDraftMonth] = useState<number>(new Date().getMonth() + 1);
  const [draftNotes, setDraftNotes] = useState("");
  const [computing, setComputing] = useState(false);

  // edit period dialog
  const [editingRow, setEditingRow] = useState<Period | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const openEdit = (p: Period) => { setEditingRow(p); setEditNotes(p.notes ?? ""); };
  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    setEditSaving(true);
    const { error } = await supabase.from("carry_over_periods").update({
      notes: editNotes.trim() || null,
    }).eq("id", editingRow.id);
    setEditSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Period notes updated.");
    setEditingRow(null);
    refresh();
  };

  // sysadmin settings
  const [autoClose, setAutoClose] = useState(false);

  useEffect(() => { document.title = "Carry-Over Periods – NPF BMS"; }, []);

  const refresh = async () => {
    setLoading(true);
    const [{ data: pRows }, { data: lRows }, { data: settings }, { data: subs }, { data: cats }] = await Promise.all([
      supabase.from("carry_over_periods").select("*").eq("fiscal_year", year).order("period_month", { ascending: true }),
      supabase.from("carry_over_lines").select("*"),
      supabase.from("app_settings").select("value").eq("key", "carry_over_auto_close").maybeSingle(),
      supabase.from("budget_sub_items").select("code,name,category_code").order("sort"),
      supabase.from("budget_categories").select("code,name").order("sort"),
    ]);
    setPeriods((pRows ?? []) as Period[]);
    setLines((lRows ?? []) as Line[]);
    setSubItems((subs ?? []) as SubItem[]);
    setCategories((cats ?? []) as Category[]);
    const flag = (settings as any)?.value;
    setAutoClose(Boolean(flag?.enabled ?? false));

    const ids = new Set<string>();
    (pRows ?? []).forEach((p: any) => {
      [p.created_by, p.submitted_by, p.reviewed_by, p.approved_by].forEach((x) => x && ids.add(x));
    });
    if (ids.size) {
      const { data: profs } = await supabase.from("profiles").select("user_id,full_name,email").in("user_id", Array.from(ids));
      const map: Record<string, ProfileLite> = {};
      (profs ?? []).forEach((p: any) => { map[p.user_id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [year]);

  useEffect(() => {
    if (!openId) { setActions([]); return; }
    (async () => {
      const { data } = await supabase.from("approval_actions").select("*")
        .eq("record_type", "carry_over_periods").eq("record_id", openId)
        .order("created_at", { ascending: true });
      setActions((data ?? []) as ApprovalAction[]);
    })();
  }, [openId]);

  // Load reconciliation when drawer opens
  useEffect(() => {
    if (!openPeriod) { setRecon(null); return; }
    const p = openPeriod;
    setReconLoading(true);
    (async () => {
      const start = new Date(Date.UTC(p.fiscal_year, p.period_month - 1, 1)).toISOString().slice(0, 10);
      const end = new Date(Date.UTC(p.fiscal_year, p.period_month, 1)).toISOString().slice(0, 10);
      const [{ data: ifs }, { data: exs }] = await Promise.all([
        supabase.from("fund_inflows").select("amount")
          .eq("fiscal_year", p.fiscal_year).eq("status", "APPROVED")
          .gte("inflow_date", start).lt("inflow_date", end),
        supabase.from("expenditures").select("net_amount,gross_amount")
          .eq("fiscal_year", p.fiscal_year).eq("status", "APPROVED")
          .gte("expense_date", start).lt("expense_date", end),
      ]);
      const inflowsActual = (ifs ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      const expendedActual = (exs ?? []).reduce((s: number, r: any) => s + Number(r.net_amount ?? r.gross_amount ?? 0), 0);
      setRecon({
        inflowsActual,
        expendedActual,
        inflowsDiff: Number(p.total_inflows) - inflowsActual,
        expendedDiff: Number(p.total_expended) - expendedActual,
      });
      setReconLoading(false);
    })();
  }, [openPeriod]);

  // Recompute period totals from live approved data (clerk on own draft only)
  const reconcilePeriod = async (p: Period) => {
    if (!isClk || p.created_by !== user!.id) {
      toast.error("Only the owning clerk can recompute this period."); return;
    }
    const start = new Date(Date.UTC(p.fiscal_year, p.period_month - 1, 1)).toISOString().slice(0, 10);
    const end = new Date(Date.UTC(p.fiscal_year, p.period_month, 1)).toISOString().slice(0, 10);
    const [{ data: ifs }, { data: exs }] = await Promise.all([
      supabase.from("fund_inflows").select("amount").eq("fiscal_year", p.fiscal_year).eq("status", "APPROVED").gte("inflow_date", start).lt("inflow_date", end),
      supabase.from("expenditures").select("net_amount,gross_amount,sub_item_code").eq("fiscal_year", p.fiscal_year).eq("status", "APPROVED").gte("expense_date", start).lt("expense_date", end),
    ]);
    const inflowsActual = (ifs ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    let expendedActual = 0;
    const byCode: Record<string, number> = {};
    (exs ?? []).forEach((r: any) => {
      const v = Number(r.net_amount ?? r.gross_amount ?? 0);
      expendedActual += v;
      byCode[r.sub_item_code] = (byCode[r.sub_item_code] || 0) + v;
    });
    const totalAvailable = Number(p.opening_balance) + inflowsActual;
    const pct = totalAvailable > 0 ? Math.min(100, (expendedActual / totalAvailable) * 100) : 0;
    const residual = totalAvailable - expendedActual;
    const { error } = await supabase.from("carry_over_periods").update({
      total_inflows: inflowsActual, total_expended: expendedActual, residual, percent_utilized: pct,
    }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    // refresh lines: keep existing openings, update expended/residual
    const existing = lines.filter(l => l.period_id === p.id);
    for (const l of existing) {
      const ex = Number(byCode[l.sub_item_code] || 0);
      const op = Number(l.opening_balance);
      const av = op;
      const lpct = av > 0 ? Math.min(100, (ex / av) * 100) : (ex > 0 ? 100 : 0);
      await supabase.from("carry_over_lines").update({ expended: ex, residual: op - ex, percent_utilized: lpct }).eq("id", l.id);
    }
    toast.success("Period reconciled with live approved data.");
    refresh();
  };

  const nm = (id?: string | null) => {
    if (!id) return "—";
    const p = profiles[id]; return p?.full_name || p?.email || id.slice(0, 8);
  };
  const dt = (s?: string | null) => s ? new Date(s).toLocaleString() : "—";

  // ---- Compute & create a draft period
  const computeAndCreate = async () => {
    if (!isClk) { toast.error("Only Budget Clerks can open a period."); return; }
    const existing = periods.find(p => p.period_month === draftMonth);
    if (existing) { toast.error(`${MONTHS[draftMonth-1]} ${year} already exists.`); return; }
    setComputing(true);

    const start = new Date(Date.UTC(year, draftMonth - 1, 1)).toISOString().slice(0, 10);
    const end = new Date(Date.UTC(year, draftMonth, 1)).toISOString().slice(0, 10);

    // opening balance = residual of latest APPROVED prior period (same FY)
    const prior = [...periods].filter(p => p.status === "APPROVED" && p.period_month < draftMonth)
      .sort((a,b) => b.period_month - a.period_month)[0];
    const opening = Number(prior?.residual ?? 0);

    // inflows: APPROVED only, in month
    const { data: ifRows } = await supabase.from("fund_inflows").select("amount,inflow_date,status")
      .eq("fiscal_year", year).eq("status", "APPROVED").gte("inflow_date", start).lt("inflow_date", end);
    const totalInflows = (ifRows ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

    // expenditures: APPROVED only, in month, group by sub_item_code
    const { data: exRows } = await supabase.from("expenditures")
      .select("net_amount,gross_amount,sub_item_code,expense_date,status")
      .eq("fiscal_year", year).eq("status", "APPROVED").gte("expense_date", start).lt("expense_date", end);
    const expByCode: Record<string, number> = {};
    let totalExpended = 0;
    (exRows ?? []).forEach((r: any) => {
      const v = Number(r.net_amount ?? r.gross_amount ?? 0);
      totalExpended += v;
      expByCode[r.sub_item_code] = (expByCode[r.sub_item_code] || 0) + v;
    });

    // also pull prior-period line residuals to seed opening per sub_item_code
    const priorLines = prior ? lines.filter(l => l.period_id === prior.id) : [];
    const openByCode: Record<string, number> = {};
    priorLines.forEach((l) => { openByCode[l.sub_item_code] = Number(l.residual || 0); });

    const totalAvailable = opening + totalInflows;
    const pct = totalAvailable > 0 ? Math.min(100, (totalExpended / totalAvailable) * 100) : 0;
    const residual = totalAvailable - totalExpended;

    const { data: ins, error } = await supabase.from("carry_over_periods").insert({
      fiscal_year: year, period_month: draftMonth,
      opening_balance: opening, total_inflows: totalInflows, total_expended: totalExpended,
      residual, percent_utilized: pct, notes: draftNotes || null,
      status: "DRAFT", created_by: user!.id,
    }).select("id").single();
    if (error) { toast.error(error.message); setComputing(false); return; }

    // build per-code lines (union of opening + expended codes)
    const codes = new Set<string>([...Object.keys(openByCode), ...Object.keys(expByCode)]);
    if (codes.size) {
      const payload = Array.from(codes).map((code) => {
        const op = Number(openByCode[code] || 0);
        const ex = Number(expByCode[code] || 0);
        const avail = op; // inflows are not per-code here; aggregate at period level
        const res = op - ex;
        const p = avail > 0 ? Math.min(100, (ex / avail) * 100) : (ex > 0 ? 100 : 0);
        return { period_id: ins.id, sub_item_code: code, opening_balance: op, inflows: 0, expended: ex, residual: res, percent_utilized: p };
      });
      await supabase.from("carry_over_lines").insert(payload);
    }

    toast.success(`Draft period ${MONTHS[draftMonth-1]} ${year} created.`);
    setCreateOpen(false); setDraftNotes(""); setComputing(false);
    refresh();
  };

  const submit = async (p: Period) => {
    const { error } = await supabase.from("carry_over_periods").update({
      status: "SUBMITTED", submitted_by: user!.id, submitted_at: new Date().toISOString(),
    }).eq("id", p.id);
    if (error) toast.error(error.message); else { toast.success("Submitted for officer review."); refresh(); }
  };

  const openAction = (p: Period, kind: "REVIEW" | "APPROVE" | "RETURN") => {
    setActionRow(p); setActionKind(kind); setRemarks("");
  };
  const performAction = async () => {
    if (!actionRow || !actionKind) return;
    const id = actionRow.id; const now = new Date().toISOString();
    let patch: any = {};
    if (actionKind === "REVIEW") patch = { status: "OFFICER_REVIEWED", reviewed_by: user!.id, reviewed_at: now };
    else if (actionKind === "APPROVE") patch = { status: "APPROVED", approved_by: user!.id, approved_at: now };
    else if (actionKind === "RETURN") {
      if (!remarks.trim()) { toast.error("Remarks required when returning."); return; }
      patch = { status: "RETURNED", return_remarks: remarks.trim() };
    }
    const { error } = await supabase.from("carry_over_periods").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("approval_actions").insert({
      record_type: "carry_over_periods", record_id: id, actor: user!.id,
      action: actionKind, remarks: remarks.trim() || null,
    });
    toast.success("Action recorded.");
    setActionRow(null); setActionKind(null); setRemarks(""); refresh();
  };

  const del = async (p: Period) => {
    const adminOverride = isSys && p.status !== "DRAFT";
    const msg = adminOverride
      ? `ADMIN DELETE: permanently delete ${MONTHS[p.period_month-1]} ${p.fiscal_year} (status: ${p.status})? Cannot be undone.`
      : `Delete draft for ${MONTHS[p.period_month-1]} ${p.fiscal_year}?`;
    if (!confirm(msg)) return;
    const { error } = await supabase.from("carry_over_periods").delete().eq("id", p.id);
    if (error) toast.error(error.message); else { toast.success("Deleted."); refresh(); }
  };

  const saveAutoClose = async (enabled: boolean) => {
    setAutoClose(enabled);
    const { error } = await supabase.from("app_settings").upsert(
      { key: "carry_over_auto_close", value: { enabled } as any, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    if (error) toast.error(error.message); else toast.success(`Auto-close ${enabled ? "enabled" : "disabled"}.`);
  };

  // ---- PDF statement
  const downloadStatement = async (p: Period) => {
    const pls = lines.filter(l => l.period_id === p.id);
    const { data: actData } = await supabase.from("approval_actions")
      .select("action,remarks,created_at,actor")
      .eq("record_type", "carry_over_periods").eq("record_id", p.id)
      .order("created_at", { ascending: true });
    const acts = (actData ?? []) as { action: string; remarks: string | null; created_at: string; actor: string }[];

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    let y = 40;
    try { doc.addImage(npfLogo, "PNG", 40, y, 40, 40); } catch {}
    doc.setFont("helvetica","bold"); doc.setFontSize(13);
    doc.text("NIGERIA POLICE FORCE", 90, y + 16);
    doc.setFontSize(10); doc.text("Budget and Accounting Digital System", 90, y + 30);
    doc.setFontSize(14); doc.text("MONTHLY CARRY-OVER STATEMENT", W/2, y + 60, { align: "center" });
    y += 90;

    // watermark
    const wm = p.status === "APPROVED" ? "APPROVED" : p.status;
    try { (doc as any).setGState(new (doc as any).GState({ opacity: 0.06 })); } catch {}
    doc.setFont("helvetica","bold"); doc.setFontSize(80);
    doc.setTextColor(p.status === "APPROVED" ? 0 : 180, p.status === "APPROVED" ? 120 : 30, 0);
    doc.text(wm, W/2, H/2, { align: "center", angle: 30 } as any);
    try { (doc as any).setGState(new (doc as any).GState({ opacity: 1 })); } catch {}
    doc.setTextColor(0);

    doc.setFont("helvetica","normal"); doc.setFontSize(10);
    const meta: [string, string][] = [
      ["Period", `${MONTHS[p.period_month-1]} ${p.fiscal_year}`],
      ["Status", p.status.replace(/_/g," ")],
      ["Opening Balance (carried in)", fmtN(Number(p.opening_balance))],
      ["Total Inflows (month)", fmtN(Number(p.total_inflows))],
      ["Total Expended (month)", fmtN(Number(p.total_expended))],
      ["Utilisation", `${Number(p.percent_utilized).toFixed(2)}%`],
      ["Closing Residual (carry forward)", fmtN(Number(p.residual))],
      ["Notes", p.notes || "—"],
    ];
    meta.forEach(([k,v]) => {
      doc.setFont("helvetica","bold"); doc.text(`${k}:`, 40, y);
      doc.setFont("helvetica","normal");
      const vL = doc.splitTextToSize(String(v), W - 240);
      doc.text(vL, 240, y); y += Math.max(14, vL.length * 12);
    });
    y += 8;

    if (pls.length) {
      doc.setFont("helvetica","bold"); doc.setFontSize(11);
      doc.text("Per Sub-Item Breakdown", 40, y); y += 14;
      doc.setFontSize(9);
      doc.text("Code", 40, y); doc.text("Opening", 140, y, { align: "right" });
      doc.text("Expended", 230, y, { align: "right" });
      doc.text("Residual", 320, y, { align: "right" });
      doc.text("% Used", 400, y, { align: "right" });
      y += 4; doc.line(40, y, W-40, y); y += 10;
      doc.setFont("helvetica","normal");
      pls.forEach((l) => {
        if (y > H - 140) { doc.addPage(); y = 60; }
        doc.text(l.sub_item_code, 40, y);
        doc.text(fmtN(Number(l.opening_balance)), 140, y, { align: "right" });
        doc.text(fmtN(Number(l.expended)), 230, y, { align: "right" });
        doc.text(fmtN(Number(l.residual)), 320, y, { align: "right" });
        doc.text(`${Number(l.percent_utilized).toFixed(1)}%`, 400, y, { align: "right" });
        y += 12;
      });
      y += 10;
    }

    // approval trail
    if (y > H - 200) { doc.addPage(); y = 60; }
    doc.setFont("helvetica","bold"); doc.setFontSize(11);
    doc.text("Approval Trail", 40, y); y += 14;
    doc.setFontSize(9); doc.setFont("helvetica","normal");
    const trail: { label: string; ts: string | null; who: string | null; remarks?: string | null }[] = [
      { label: "Created (Clerk)", ts: p.created_at, who: p.created_by },
      { label: "Submitted", ts: p.submitted_at, who: p.submitted_by },
      { label: "Officer Reviewed", ts: p.reviewed_at, who: p.reviewed_by },
      { label: "Director Approved", ts: p.approved_at, who: p.approved_by },
    ];
    trail.forEach((t) => {
      if (y > H - 80) { doc.addPage(); y = 60; }
      doc.setFont("helvetica","bold"); doc.text(`${t.label}:`, 40, y);
      doc.setFont("helvetica","normal");
      doc.text(`${dt(t.ts)} — ${nm(t.who)}`, 180, y); y += 12;
    });
    acts.forEach((a) => {
      if (y > H - 80) { doc.addPage(); y = 60; }
      doc.setFont("helvetica","bold"); doc.text(`${a.action}:`, 40, y);
      doc.setFont("helvetica","normal");
      doc.text(`${dt(a.created_at)} — ${nm(a.actor)}`, 180, y); y += 12;
      if (a.remarks) { const lns = doc.splitTextToSize(`Remarks: ${a.remarks}`, W - 80); doc.text(lns, 60, y); y += lns.length * 11; }
    });
    if (p.return_remarks) {
      if (y > H - 60) { doc.addPage(); y = 60; }
      doc.setFont("helvetica","bold"); doc.text("Return Remarks:", 40, y); y += 12;
      doc.setFont("helvetica","normal");
      const lns = doc.splitTextToSize(p.return_remarks, W - 80); doc.text(lns, 40, y); y += lns.length * 11;
    }

    // page numbers
    const total = (doc as any).getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(120);
      doc.text(`Page ${i} of ${total}`, W/2, H - 20, { align: "center" });
      doc.setTextColor(0);
    }
    doc.save(`carry-over_${p.fiscal_year}-${String(p.period_month).padStart(2,"0")}.pdf`);
  };

  // ---- Render
  const years = useMemo(() => {
    const ys = new Set<number>([new Date().getFullYear()]);
    periods.forEach(p => ys.add(p.fiscal_year));
    return Array.from(ys).sort((a,b) => b - a);
  }, [periods]);

  const totals = useMemo(() => {
    const inflowSum = periods.reduce((s,p) => s + Number(p.total_inflows||0), 0);
    const expSum = periods.reduce((s,p) => s + Number(p.total_expended||0), 0);
    const lastApproved = [...periods].filter(p => p.status === "APPROVED").sort((a,b) => b.period_month - a.period_month)[0];
    return { inflowSum, expSum, residual: lastApproved?.residual ?? 0, lastMonth: lastApproved?.period_month };
  }, [periods]);

  // Codes belonging to active category filter
  const codesInCategory = useMemo(() => {
    if (filterCategory === "ALL") return null;
    return new Set(subItems.filter(s => s.category_code === filterCategory).map(s => s.code));
  }, [filterCategory, subItems]);

  // Periods that contain at least one matching line (when a code/category filter is set)
  const matchingPeriodIds = useMemo(() => {
    if (filterCode === "ALL" && filterCategory === "ALL") return null;
    const ids = new Set<string>();
    lines.forEach(l => {
      const codeMatch = filterCode === "ALL" || l.sub_item_code === filterCode;
      const catMatch = !codesInCategory || codesInCategory.has(l.sub_item_code);
      if (codeMatch && catMatch) ids.add(l.period_id);
    });
    return ids;
  }, [lines, filterCode, codesInCategory, filterCategory]);

  const filterActive = filterCode !== "ALL" || filterCategory !== "ALL";
  const lineMatches = (l: Line) => {
    if (filterCode !== "ALL" && l.sub_item_code !== filterCode) return false;
    if (codesInCategory && !codesInCategory.has(l.sub_item_code)) return false;
    return true;
  };
  const filteredOpenLines = useMemo(() => filterActive ? openLines.filter(lineMatches) : openLines, [openLines, filterActive, filterCode, codesInCategory]);

  const visibleSubItems = useMemo(
    () => filterCategory === "ALL" ? subItems : subItems.filter(s => s.category_code === filterCategory),
    [subItems, filterCategory]
  );

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold text-primary">Monthly Carry-Over</h1>
          <p className="text-sm text-muted-foreground">Close each month with full trail; unspent inflows roll into the next month.</p>
        </div>
        <div className="flex gap-2 items-end">
          <div className="w-32">
            <Label className="text-xs">Fiscal Year</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {isClk && (
            <Button onClick={() => setCreateOpen(true)}><PlusCircle className="mr-1.5 h-4 w-4" /> Close a month</Button>
          )}
          <Button variant="outline" onClick={refresh}><RefreshCw className="mr-1.5 h-4 w-4" /> Refresh</Button>
        </div>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-normal text-muted-foreground">Total Inflows {year}</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold">{fmtN(totals.inflowSum)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-normal text-muted-foreground">Total Expended {year}</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold">{fmtN(totals.expSum)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-normal text-muted-foreground">Active Carry-Forward</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold text-accent">{fmtN(Number(totals.residual||0))}</p><p className="text-[10px] text-muted-foreground">{totals.lastMonth ? `As of ${MONTHS[totals.lastMonth-1]} close` : "No approved period yet"}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-normal text-muted-foreground">Closed Months</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold">{periods.filter(p => p.status === "APPROVED").length} / 12</p></CardContent></Card>
      </div>

      {isSys && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">System Administrator Settings</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Automatic month-close</p>
              <p className="text-xs text-muted-foreground">When enabled, the system generates a DRAFT carry-over for the previous month on the 1st of every month. Approval still required.</p>
            </div>
            <Switch checked={autoClose} onCheckedChange={saveAutoClose} />
          </CardContent>
        </Card>
      )}

      {/* Month timeline */}
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-sm">{year} Month Timeline</CardTitle>
          <div className="flex flex-wrap items-end gap-2 pt-1">
            <Filter className="h-4 w-4 text-muted-foreground mb-2" />
            <div className="w-56">
              <Label className="text-[10px] uppercase text-muted-foreground">Budget category</Label>
              <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setFilterCode("ALL"); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All categories</SelectItem>
                  {categories.map(c => <SelectItem key={c.code} value={c.code}>{c.code} · {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-72">
              <Label className="text-[10px] uppercase text-muted-foreground">Sub-item code</Label>
              <Select value={filterCode} onValueChange={setFilterCode}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="ALL">All sub-items</SelectItem>
                  {visibleSubItems.map(s => <SelectItem key={s.code} value={s.code}>{s.code} · {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {filterActive && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterCategory("ALL"); setFilterCode("ALL"); }}>
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
            {filterActive && (
              <p className="text-[11px] text-muted-foreground ml-auto mb-2">
                Showing months that include {filterCode !== "ALL" ? filterCode : "any code in category"}.
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <div className="space-y-2">
              {MONTHS.map((m, idx) => {
                const p = periods.find(pp => pp.period_month === idx + 1);
                if (filterActive && p && matchingPeriodIds && !matchingPeriodIds.has(p.id)) return null;
                if (filterActive && !p) return null;
                const pct = p ? Math.min(100, Number(p.percent_utilized||0)) : 0;
                return (
                  <div key={m} className="flex flex-wrap items-center gap-3 border rounded-md p-3">
                    <div className="flex items-center gap-2 w-40">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{m}</span>
                    </div>
                    {p ? (
                      <>
                        <Badge variant={STATUS_VARIANT[p.status]}>{p.status.replace(/_/g," ")}</Badge>
                        <div className="flex-1 min-w-[180px]">
                          <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span>Utilised {pct.toFixed(1)}%</span>
                            <span>Residual {fmtN(Number(p.residual))}</span>
                          </div>
                          <Progress value={pct} className="h-2" />
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          In {fmtN(Number(p.total_inflows))} · Out {fmtN(Number(p.total_expended))} · Opening {fmtN(Number(p.opening_balance))}
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => setOpenId(p.id)}><History className="h-3 w-3 mr-1" /> Trail</Button>
                          <Button size="sm" variant="outline" onClick={() => downloadStatement(p)}><FileDown className="h-3 w-3 mr-1" /> PDF</Button>
                          {isClk && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => reconcilePeriod(p)} title="Recompute totals from live approved data">
                                <RefreshCw className="h-3 w-3 mr-1" /> Recompute
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openEdit(p)} title="Edit period notes">
                                <Pencil className="h-3 w-3 mr-1" /> Edit
                              </Button>
                              {(p.status === "DRAFT" || p.status === "RETURNED") && (
                                <Button size="sm" onClick={() => submit(p)}><Send className="h-3 w-3 mr-1" /> Submit</Button>
                              )}
                            </>
                          )}
                          {isOff && p.status === "SUBMITTED" && p.created_by !== user!.id && (
                            <>
                              <Button size="sm" onClick={() => openAction(p, "REVIEW")}><Check className="h-3 w-3 mr-1" /> Review</Button>
                              <Button size="sm" variant="destructive" onClick={() => openAction(p, "RETURN")}><X className="h-3 w-3 mr-1" /> Return</Button>
                            </>
                          )}
                          {isDir && p.status === "OFFICER_REVIEWED" && p.created_by !== user!.id && p.reviewed_by !== user!.id && (
                            <>
                              <Button size="sm" onClick={() => openAction(p, "APPROVE")}><Check className="h-3 w-3 mr-1" /> Approve</Button>
                              <Button size="sm" variant="destructive" onClick={() => openAction(p, "RETURN")}><X className="h-3 w-3 mr-1" /> Return</Button>
                            </>
                          )}
                          {((isClk && p.status === "DRAFT") || isSys) && (
                            <Button size="sm" variant="ghost" onClick={() => del(p)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline" className="text-muted-foreground">Not closed</Badge>
                        {isClk && (
                          <Button size="sm" variant="outline" onClick={() => { setDraftMonth(idx + 1); setCreateOpen(true); }}>
                            <PlusCircle className="h-3 w-3 mr-1" /> Close month
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Close a month — {year}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Month</Label>
              <Select value={String(draftMonth)} onValueChange={(v) => setDraftMonth(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} placeholder="e.g. Reasons for under-utilisation…" />
            </div>
            <p className="text-xs text-muted-foreground">
              The system will compute opening balance from the prior approved month, sum approved inflows and expenditures for {MONTHS[draftMonth-1]} {year}, and create a DRAFT for officer review.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={computeAndCreate} disabled={computing}>{computing ? "Computing…" : "Compute & Create Draft"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval action dialog */}
      <Dialog open={!!actionKind} onOpenChange={(o) => !o && setActionKind(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{actionKind === "RETURN" ? "Return" : actionKind === "REVIEW" ? "Officer Review" : "Director Approve"}</DialogTitle></DialogHeader>
          <Textarea placeholder={actionKind === "RETURN" ? "Remarks (required)" : "Remarks (optional)"} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionKind(null)}>Cancel</Button>
            <Button onClick={performAction}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trail drawer */}
      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>{openPeriod ? `${MONTHS[openPeriod.period_month-1]} ${openPeriod.fiscal_year} — Trail` : "Trail"}</SheetTitle></SheetHeader>
          {openPeriod && (
            <div className="space-y-4 mt-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Opening</p><p className="font-medium">{fmtN(Number(openPeriod.opening_balance))}</p></div>
                <div><p className="text-xs text-muted-foreground">Inflows</p><p className="font-medium">{fmtN(Number(openPeriod.total_inflows))}</p></div>
                <div><p className="text-xs text-muted-foreground">Expended</p><p className="font-medium">{fmtN(Number(openPeriod.total_expended))}</p></div>
                <div><p className="text-xs text-muted-foreground">Residual (carry-forward)</p><p className="font-medium text-accent">{fmtN(Number(openPeriod.residual))}</p></div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Utilisation</p>
                  <Progress value={Math.min(100, Number(openPeriod.percent_utilized||0))} className="h-2" />
                  <p className="text-[11px] mt-1">{Number(openPeriod.percent_utilized||0).toFixed(2)}%</p>
                </div>
              </div>

              <div>
                <p className="font-medium mb-1">Approval Stages</p>
                <ol className="space-y-1 text-xs">
                  <li>• Created — {dt(openPeriod.created_at)} by {nm(openPeriod.created_by)}</li>
                  <li>• Submitted — {dt(openPeriod.submitted_at)} by {nm(openPeriod.submitted_by)}</li>
                  <li>• Officer Reviewed — {dt(openPeriod.reviewed_at)} by {nm(openPeriod.reviewed_by)}</li>
                  <li>• Director Approved — {dt(openPeriod.approved_at)} by {nm(openPeriod.approved_by)}</li>
                </ol>
                {openPeriod.return_remarks && <p className="text-xs text-destructive mt-2">Return remarks: {openPeriod.return_remarks}</p>}
              </div>

              {actions.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Actions</p>
                  <ul className="space-y-1 text-xs">
                    {actions.map(a => (
                      <li key={a.id} className="border-l-2 pl-2">
                        <span className="font-medium">{a.action}</span> — {dt(a.created_at)} by {nm(a.actor)}
                        {a.remarks && <p className="text-muted-foreground">{a.remarks}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Reconciliation */}
              <div className="rounded-md border p-3 bg-muted/30">
                <div className="flex items-center gap-1.5 mb-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <p className="font-medium text-sm">Reconciliation vs. live approved data</p>
                </div>
                {reconLoading || !recon ? (
                  <p className="text-xs text-muted-foreground">Loading…</p>
                ) : (
                  <div className="text-xs overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="text-left">Metric</th>
                          <th className="text-right">Period total</th>
                          <th className="text-right">Approved actual</th>
                          <th className="text-right">Difference</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td>Inflows</td>
                          <td className="text-right">{fmtN(Number(openPeriod.total_inflows))}</td>
                          <td className="text-right">{fmtN(recon.inflowsActual)}</td>
                          <td className={`text-right font-medium ${Math.abs(recon.inflowsDiff) < 0.5 ? "text-muted-foreground" : "text-destructive"}`}>
                            {recon.inflowsDiff === 0 ? "—" : fmtN(recon.inflowsDiff)}
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td>Expended</td>
                          <td className="text-right">{fmtN(Number(openPeriod.total_expended))}</td>
                          <td className="text-right">{fmtN(recon.expendedActual)}</td>
                          <td className={`text-right font-medium ${Math.abs(recon.expendedDiff) < 0.5 ? "text-muted-foreground" : "text-destructive"}`}>
                            {recon.expendedDiff === 0 ? "—" : fmtN(recon.expendedDiff)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    {(Math.abs(recon.inflowsDiff) >= 0.5 || Math.abs(recon.expendedDiff) >= 0.5) && (
                      <div className="flex items-start gap-1.5 mt-2 text-[11px] text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
                        <span>
                          Period figures drift from current approved totals — likely because inflows or expenditures were approved after this period was opened.
                          {isClk && openPeriod.created_by === user!.id && (openPeriod.status === "DRAFT" || openPeriod.status === "RETURNED") && " Click Recompute on the row to refresh."}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {filteredOpenLines.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Per Sub-Item {filterActive && <span className="text-xs text-muted-foreground">(filtered)</span>}</p>
                  <div className="text-xs overflow-x-auto">
                    <table className="w-full">
                      <thead><tr className="text-muted-foreground"><th className="text-left w-10">S/N</th><th className="text-left">Code</th><th className="text-right">Opening</th><th className="text-right">Expended</th><th className="text-right">Residual</th><th className="text-right">%</th></tr></thead>
                      <tbody>
                        {filteredOpenLines.map((l, _i) => (
                          <tr key={l.id} className="border-t">
                            <td className="text-xs text-muted-foreground tabular-nums">{_i + 1}</td>
                            <td>{l.sub_item_code}</td>
                            <td className="text-right">{fmtN(Number(l.opening_balance))}</td>
                            <td className="text-right">{fmtN(Number(l.expended))}</td>
                            <td className="text-right">{fmtN(Number(l.residual))}</td>
                            <td className="text-right">{Number(l.percent_utilized).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" onClick={() => downloadStatement(openPeriod)}><FileDown className="h-3 w-3 mr-1" /> Download statement PDF</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!editingRow} onOpenChange={(o) => { if (!o) setEditingRow(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit period{editingRow ? ` · ${MONTHS[editingRow.period_month-1]} ${editingRow.fiscal_year}` : ""}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-3">
            <div>
              <Label>Notes</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={4} placeholder="e.g. Reasons for under-utilisation…" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Computed figures (opening, inflows, expended, residual) are derived. Use Recompute on the row to refresh them from approved data.
            </p>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditingRow(null)}>Cancel</Button>
              <Button type="submit" disabled={editSaving}>{editSaving ? "Saving…" : "Save changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}