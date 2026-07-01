import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, Plus, Upload, AlertTriangle, Lock, Eraser, Check, X } from "lucide-react";
import { DIRECT_AIE_DISTRIBUTED_2026 } from "@/data/directAieDistributed2026";
import { AIE_MONTHLY_ACTUALS_2026, getActualOverrides, isAuthoritativeActualMonth, monthlySpentKey as sharedMonthlySpentKey } from "@/data/aieMonthlyActuals2026";
import { getAnnualAppropriation2026, getPercentAllocated2026, getCodeName2026, ALL_CODES_2026, ANNUAL_APPROPRIATION_2026 } from "@/data/aieAnnualAppropriation2026";
import { AIE_RECEIVED_2026, AIE_SPENT_TOTAL_2026, AIE_BALANCE_2026 } from "@/data/fy2026Targets";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem,
} from "@/components/ui/context-menu";
import { Label } from "@/components/ui/label";
import { BudgetCode } from "@/components/BudgetCode";

type AIE = { id: string; fiscal_year: number; issue_date: string; sub_item_code: string | null; amount: number };
type SubItem = { code: string; name: string };

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;
const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"] as const;
const distOverrideKey = (fy: number) => `npf:aieDistributedOverride:${fy}`;
const extraMonthsKey = (fy: number) => `npf:aieExtraMonths:${fy}`;
const monthlySpentKey = sharedMonthlySpentKey;
const MONTH_FILTER_KEY = "npf:aieMonthFilter";
type Row = {
  code: string;
  name: string;
  months: Record<number, number>; // monthIndex -> amount
  spent: Record<number, number>;  // monthIndex -> actual spend
  total: number;
  distributed: number;
  totalActual: number;            // Σ spent across months (derived)
  balance: number;
};
type SortKey = "code" | "name" | "total" | "totalActual" | "balance" | `m${number}` | `s${number}`;

export function AieBalancesSummary({
  aieRows,
  subByCode,
  availableYears,
  onChanged,
}: {
  aieRows: AIE[];
  subByCode: Record<string, SubItem>;
  availableYears: number[];
  onChanged?: () => void;
}) {
  const years = availableYears.length ? availableYears : [2026];
  const defaultYear = years.includes(2026) ? 2026 : years[years.length - 1];
  const [fy, setFy] = useState<number>(defaultYear);
  const [sortKey, setSortKey] = useState<SortKey>("code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [distByCode, setDistByCode] = useState<Record<string, number>>({});
  const [distOverrides, setDistOverrides] = useState<Record<string, number>>({});
  // Per-code, per-month actual spend overrides, persisted locally per FY.
  // Shape: { [code]: { [monthIndex]: amount } }
  const [spentOverrides, setSpentOverrides] = useState<Record<string, Record<number, number>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [extraMonths, setExtraMonths] = useState<number[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [clearing, setClearing] = useState<string | null>(null);
  // Draft month: user clicked Add Month → Enter Manually. A new editable
  // column appears in the table but nothing is written to the DB until the
  // user clicks Save. Cancel discards.
  const [draftMonth, setDraftMonth] = useState<number | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, number>>({});
  const [savingDraft, setSavingDraft] = useState(false);
  const [monthFilter, setMonthFilter] = useState<number | "ALL">(() => {
    try {
      const raw = localStorage.getItem(MONTH_FILTER_KEY);
      if (raw === null) return "ALL";
      if (raw === "ALL") return "ALL";
      const n = Number(raw);
      return Number.isFinite(n) && n >= 0 && n <= 11 ? n : "ALL";
    } catch { return "ALL"; }
  });
  useEffect(() => {
    try { localStorage.setItem(MONTH_FILTER_KEY, monthFilter === "ALL" ? "ALL" : String(monthFilter)); } catch {}
  }, [monthFilter]);

  const latestYear = Math.max(...years, 2026);
  const isReadOnly = fy < latestYear;

  // Load distributed overrides for the selected FY from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(distOverrideKey(fy));
      setDistOverrides(raw ? JSON.parse(raw) : {});
    } catch { setDistOverrides({}); }
    try {
      const raw = localStorage.getItem(extraMonthsKey(fy));
      setExtraMonths(raw ? JSON.parse(raw) : []);
    } catch { setExtraMonths([]); }
    try {
      setSpentOverrides(getActualOverrides(fy));
    } catch { setSpentOverrides({}); }
  }, [fy]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // For FY 2026, distributed totals come from the workbook ("Total Amount Distributed By Direct AIE")
      if (fy === 2026) {
        if (!cancelled) setDistByCode({ ...DIRECT_AIE_DISTRIBUTED_2026 });
        return;
      }
      const { data: batches } = await supabase
        .from("distribution_batches")
        .select("id")
        .eq("fiscal_year", fy);
      const ids = (batches ?? []).map((b: any) => b.id);
      if (ids.length === 0) { if (!cancelled) setDistByCode({}); return; }
      const { data: lines } = await supabase
        .from("distribution_lines")
        .select("sub_item_code, amount, batch_id")
        .in("batch_id", ids);
      const m: Record<string, number> = {};
      (lines ?? []).forEach((l: any) => {
        const c = l.sub_item_code || "";
        m[c] = (m[c] || 0) + Number(l.amount || 0);
      });
      if (!cancelled) setDistByCode(m);
    })();
    return () => { cancelled = true; };
  }, [fy, aieRows.length]);

  // Aggregate amounts per code per month index. Determine which months have data.
  const { rows, months } = useMemo(() => {
    const agg: Record<string, Record<number, number>> = {};
    const dataMonths = new Set<number>();
    // Seed months from authoritative FY2026 actuals so Jan/Feb/Mar columns
    // appear even when no AIE record yet exists in that month.
    const actualsForFy: Record<string, Record<number, number>> =
      fy === 2026 ? AIE_MONTHLY_ACTUALS_2026 : {};
    if (fy === 2026) {
      Object.values(actualsForFy).forEach(map => {
        Object.keys(map).forEach(k => {
          const mi = Number(k);
          if (monthFilter === "ALL" || mi === monthFilter) dataMonths.add(mi);
        });
      });
    }
    aieRows.forEach(r => {
      if (r.fiscal_year !== fy) return;
      const code = r.sub_item_code || "—";
      const m = new Date(r.issue_date).getMonth();
      if (monthFilter !== "ALL" && m !== monthFilter) return;
      dataMonths.add(m);
      if (!agg[code]) agg[code] = {};
      agg[code][m] = (agg[code][m] || 0) + Number(r.amount || 0);
    });
    // A month column is shown only if at least one record exists in that
    // month (or it was opened via "Add Month" AND still has data).
    // Extra months with zero data are auto-removed so empty columns vanish
    // as soon as their last record is deleted.
    const monthSet = new Set<number>([
      ...Array.from(dataMonths),
      ...extraMonths.filter(m => dataMonths.has(m) && (monthFilter === "ALL" || m === monthFilter)),
      ...(draftMonth != null && (monthFilter === "ALL" || draftMonth === monthFilter) ? [draftMonth] : []),
    ]);
    const monthList = Array.from(monthSet).sort((a, b) => a - b);
    const codes = new Set([
      ...Object.keys(agg),
      ...Object.keys(distByCode),
      ...Object.keys(actualsForFy),
      ...(fy === 2026 ? ALL_CODES_2026 : []),
    ]);
    const out: Row[] = Array.from(codes).map(code => {
      const m = agg[code] ?? {};
      const monthsMap: Record<number, number> = {};
      let total = 0;
      for (const mi of monthList) {
        const v = mi === draftMonth ? (draftValues[code] || 0) : (m[mi] || 0);
        monthsMap[mi] = v;
        total += v;
      }
      const distributed = distOverrides[code] ?? (distByCode[code] || 0);
      // Actual spend: explicit override wins, else the authoritative FY2026
      // monthly actuals from the workbook, else a proportional split of the
      // distributed total weighted by each month's authorisation share.
      const ov = spentOverrides[code] ?? {};
      const seed = actualsForFy[code] ?? {};
      const spentMap: Record<number, number> = {};
      for (const mi of monthList) {
        if (seed[mi] != null) {
          spentMap[mi] = Number(seed[mi]) || 0;
        } else if (isAuthoritativeActualMonth(fy, mi)) {
          spentMap[mi] = 0;
        } else if (ov[mi] != null) {
          spentMap[mi] = Number(ov[mi]) || 0;
        } else if (total > 0) {
          spentMap[mi] = +(distributed * ((monthsMap[mi] || 0) / total)).toFixed(2);
        } else {
          spentMap[mi] = 0;
        }
      }
      const totalActual = Object.values(spentMap).reduce((s, n) => s + (Number(n) || 0), 0);
      return {
        code,
        name: subByCode[code]?.name || (fy === 2026 ? getCodeName2026(code) : "") || "",
        months: monthsMap,
        spent: spentMap,
        total, distributed, totalActual,
        balance: total - totalActual,
      };
    });
    return { rows: out, months: monthList };
  }, [aieRows, fy, distByCode, distOverrides, spentOverrides, subByCode, extraMonths, monthFilter, draftMonth, draftValues]);

  // Persist auto-pruned extraMonths back to localStorage so a later refresh
  // doesn't resurrect an empty column.
  useEffect(() => {
    const dataMonths = new Set<number>();
    aieRows.forEach(r => { if (r.fiscal_year === fy) dataMonths.add(new Date(r.issue_date).getMonth()); });
    const pruned = extraMonths.filter(m => dataMonths.has(m));
    if (pruned.length !== extraMonths.length) {
      try { localStorage.setItem(extraMonthsKey(fy), JSON.stringify(pruned)); } catch {}
      setExtraMonths(pruned);
    }
  }, [aieRows, fy, extraMonths]);

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      let av: any, bv: any;
      if (typeof sortKey === "string" && sortKey.startsWith("m")) {
        const mi = Number(sortKey.slice(1));
        av = a.months[mi] || 0; bv = b.months[mi] || 0;
      } else if (typeof sortKey === "string" && sortKey.startsWith("s")) {
        const mi = Number(sortKey.slice(1));
        av = a.spent[mi] || 0; bv = b.spent[mi] || 0;
      } else {
        av = (a as any)[sortKey]; bv = (b as any)[sortKey];
      }
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      const as = String(av ?? ""), bs = String(bv ?? "");
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  const onSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir(k === "code" || k === "name" ? "asc" : "desc"); }
  };

  const totals = useMemo(() => {
    const monthTotals: Record<number, number> = {};
    const spentTotals: Record<number, number> = {};
    let total = 0, distributed = 0, totalActual = 0, balance = 0;
    for (const r of sorted) {
      for (const mi of months) {
        monthTotals[mi] = (monthTotals[mi] || 0) + (r.months[mi] || 0);
        spentTotals[mi] = (spentTotals[mi] || 0) + (r.spent[mi] || 0);
      }
      total += r.total; distributed += r.distributed; totalActual += r.totalActual; balance += r.balance;
    }
    // For FY2026 (full year view) the footer aggregates are anchored to
    // the workbook-derived figures so the AIE Records tab matches the
    // authoritative Received / Spent / Balance figures used everywhere
    // else on the platform (Dashboard, Expenditures, Reports, Variance,
    // Comparisons).
    if (fy === 2026 && monthFilter === "ALL") {
      total = AIE_RECEIVED_2026;
      totalActual = AIE_SPENT_TOTAL_2026;
      balance = AIE_BALANCE_2026;
    }
    return { months: monthTotals, spent: spentTotals, total, distributed, totalActual, balance };
  }, [sorted, months, fy, monthFilter]);

  const Th = ({ k, label, num, sticky }: { k: SortKey; label: string; num?: boolean; sticky?: "code" | "name" }) => (
    <th
      className={`p-2 ${num ? "text-right" : "text-left"} cursor-pointer select-none hover:text-foreground ${
        sticky === "code"
          ? "sticky left-0 z-30 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 shadow-[1px_0_0_hsl(var(--border))]"
          : sticky === "name"
          ? "sticky left-[112px] z-30 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 shadow-[1px_0_0_hsl(var(--border))] min-w-[220px]"
          : ""
      }`}
      onClick={() => onSort(k)}>
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === k ? "text-foreground" : "opacity-40"}`} />
      </span>
    </th>
  );

  // Save a monthly authority amount: find the aie_records row matching (fy, code, month) and update.
  // If no matching row exists, insert a new DRAFT one (requires BUDGET_CLK).
  const saveMonth = async (code: string, monthIdx: number, value: number, current: number) => {
    if (value === current) return;
    const cellKey = `${code}:${monthIdx}`;
    setSaving(cellKey);
    try {
      const matches = aieRows.filter(r =>
        r.fiscal_year === fy &&
        (r.sub_item_code || "—") === code &&
        new Date(r.issue_date).getMonth() === monthIdx
      );
      if (matches.length === 1) {
        const { error } = await supabase.from("aie_records").update({ amount: value }).eq("id", matches[0].id);
        if (error) throw error;
      } else if (matches.length === 0) {
        if (value === 0) return;
        const day = new Date(fy, monthIdx + 1, 0).getDate(); // last day of month
        const issueDate = `${fy}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const monthName = MONTH_LABELS[monthIdx].toUpperCase();
        const { data: u } = await supabase.auth.getUser();
        const uid = u.user?.id;
        if (!uid) throw new Error("Not signed in");
        const { error } = await supabase.from("aie_records").insert({
          fiscal_year: fy,
          aie_no: `NPF/${fy}/${code}/${monthName}`,
          issue_date: issueDate,
          sub_item_code: code,
          amount: value,
          recipient_unit: "naira",
          created_by: uid,
        });
        if (error) throw error;
      } else {
        // Multiple rows: scale them proportionally to the new total (preserve relative weights).
        const sum = matches.reduce((t, r) => t + Number(r.amount || 0), 0);
        if (sum === 0) {
          // Distribute evenly
          const per = value / matches.length;
          for (const r of matches) {
            const { error } = await supabase.from("aie_records").update({ amount: per }).eq("id", r.id);
            if (error) throw error;
          }
        } else {
          for (const r of matches) {
            const scaled = (Number(r.amount || 0) / sum) * value;
            const { error } = await supabase.from("aie_records").update({ amount: scaled }).eq("id", r.id);
            if (error) throw error;
          }
        }
      }
      toast.success(`Saved ${MONTH_LABELS[monthIdx]} ${fy} · ${code}`);
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save.");
    } finally {
      setSaving(null);
    }
  };

  // Save a distributed override (kept locally per FY).
  const saveDistributed = (code: string, value: number, current: number) => {
    if (value === current) return;
    const next = { ...distOverrides, [code]: value };
    try {
      localStorage.setItem(distOverrideKey(fy), JSON.stringify(next));
      setDistOverrides(next);
      toast.success(`Saved distributed · ${code}`);
    } catch {
      toast.error("Could not save locally.");
    }
  };

  // Save an actual-spend cell for (code, month). Persisted locally per FY.
  const saveSpent = (code: string, monthIdx: number, value: number, current: number) => {
    if (isAuthoritativeActualMonth(fy, monthIdx)) return;
    if (value === current) return;
    const next = { ...spentOverrides, [code]: { ...(spentOverrides[code] ?? {}), [monthIdx]: value } };
    try {
      localStorage.setItem(monthlySpentKey(fy), JSON.stringify(next));
      setSpentOverrides(next);
      toast.success(`Saved spent · ${MONTH_LABELS[monthIdx]} ${fy} · ${code}`);
    } catch {
      toast.error("Could not save locally.");
    }
  };

  // Clear an individual monthly cell — deletes every aie_records row that
  // matches (fy, code, month). Other months/codes are untouched. Empty month
  // columns auto-prune via the existing extra-months effect once their last
  // record is gone.
  const clearCell = async (code: string, monthIdx: number) => {
    const cellKey = `${code}:${monthIdx}`;
    setClearing(cellKey);
    try {
      const targets = aieRows.filter(r =>
        r.fiscal_year === fy &&
        (r.sub_item_code || "—") === code &&
        new Date(r.issue_date).getMonth() === monthIdx
      );
      if (targets.length === 0) { toast.message("Cell is already empty."); return; }
      const ids = targets.map(t => t.id);
      await supabase.from("aie_lines").delete().in("aie_id", ids);
      const { error } = await supabase.from("aie_records").delete().in("id", ids);
      if (error) throw error;
      toast.success(`Cleared ${MONTH_LABELS[monthIdx]} ${fy} · ${code}`);
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message || "Failed to clear cell.");
    } finally {
      setClearing(null);
    }
  };

  const cancelDraft = () => {
    setDraftMonth(null);
    setDraftValues({});
  };
  const saveDraft = async () => {
    if (draftMonth == null) return;
    setSavingDraft(true);
    try {
      const entries = Object.entries(draftValues).filter(([, v]) => Number(v) > 0);
      for (const [code, v] of entries) {
        // eslint-disable-next-line no-await-in-loop
        await saveMonth(code, draftMonth, Number(v), 0);
      }
      const next = Array.from(new Set([...extraMonths, draftMonth])).sort((a, b) => a - b);
      try { localStorage.setItem(extraMonthsKey(fy), JSON.stringify(next)); } catch {}
      setExtraMonths(next);
      toast.success(`Saved ${entries.length} value(s) for ${MONTH_FULL[draftMonth]} ${fy}`);
      setDraftMonth(null);
      setDraftValues({});
    } finally {
      setSavingDraft(false);
    }
  };

  function MoneyInput({
    value, onCommit, disabled,
  }: { value: number; onCommit: (n: number) => void; disabled?: boolean }) {
    const fmtDisplay = (n: number) =>
      n ? new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2 }).format(n) : "";
    const [focused, setFocused] = useState(false);
    const [text, setText] = useState<string>(fmtDisplay(value));
    useEffect(() => { if (!focused) setText(fmtDisplay(value)); }, [value, focused]);
    return (
      <input
        type="text"
        inputMode="decimal"
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => { setFocused(true); setText(value ? String(value) : ""); }}
        onBlur={() => {
          setFocused(false);
          const cleaned = text.replace(/,/g, "").trim();
          const n = Number(cleaned);
          if (!Number.isFinite(n) || cleaned === "") { setText(fmtDisplay(value)); return; }
          const rounded = Math.round(n * 100) / 100;
          setText(fmtDisplay(rounded));
          onCommit(rounded);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); }
          if (e.key === "Escape") { setText(fmtDisplay(value)); (e.target as HTMLInputElement).blur(); }
        }}
        className="w-full bg-transparent text-right font-mono tabular-nums outline-none border border-transparent hover:border-border focus:border-primary rounded px-1 py-0.5 disabled:opacity-50"
      />
    );
  }

  // Add Month modal: choose a month for the current FY, optionally upload CSV (code,amount).
  function AddMonthDialog() {
    const [monthIdx, setMonthIdx] = useState<number>(() => {
      for (let i = 0; i < 12; i++) if (!months.includes(i)) return i;
      return 0;
    });
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvRows, setCsvRows] = useState<{ code: string; amount: number; known: boolean }[] | null>(null);
    const [busy, setBusy] = useState(false);
    const duplicate = months.includes(monthIdx);
    const knownCodes = new Set(rows.map(r => r.code));

    const parseCsv = async (file: File) => {
      const { parseUpload } = await import("@/lib/tableUpload");
      const rows = await parseUpload(file);
      const out: { code: string; amount: number; known: boolean }[] = [];
      for (const parts of rows) {
        if (!parts || parts.length < 2) continue;
        const code = (parts[0] ?? "").trim();
        if (/code/i.test(code) && /amount/i.test(parts[1] ?? "")) continue; // header
        const amount = Number(String(parts[1] ?? "").replace(/[,\s₦]/g, ""));
        if (!code || !Number.isFinite(amount)) continue;
        out.push({ code, amount, known: knownCodes.has(code) });
      }
      setCsvRows(out);
    };

    const persistExtra = (mi: number) => {
      const next = Array.from(new Set([...extraMonths, mi])).sort((a, b) => a - b);
      localStorage.setItem(extraMonthsKey(fy), JSON.stringify(next));
      setExtraMonths(next);
    };

    const confirm = async () => {
      if (duplicate) { toast.error("That month is already a column. Pick another."); return; }
      setBusy(true);
      try {
        persistExtra(monthIdx);
        if (csvRows && csvRows.length) {
          const valid = csvRows.filter(r => r.known);
          for (const row of valid) {
            const current = rows.find(r => r.code === row.code)?.months[monthIdx] || 0;
            // eslint-disable-next-line no-await-in-loop
            await saveMonth(row.code, monthIdx, row.amount, current);
          }
          toast.success(`Imported ${valid.length} amounts for ${MONTH_FULL[monthIdx]} ${fy}`);
        } else {
          toast.success(`Added ${MONTH_FULL[monthIdx]} ${fy} column`);
        }
        setAddOpen(false);
      } finally {
        setBusy(false);
      }
    };

    const enterManually = () => {
      if (duplicate) { toast.error("That month is already a column. Pick another."); return; }
      setDraftMonth(monthIdx);
      setDraftValues({});
      setAddOpen(false);
      toast.message(`${MONTH_FULL[monthIdx]} ${fy} added as draft — fill cells then click Save.`);
    };

    return (
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Month · {fy}</DialogTitle>
            <DialogDescription>
              Add a new monthly column. You can fill amounts inline afterwards, or upload a CSV now.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Month</Label>
              <Select value={String(monthIdx)} onValueChange={(v) => setMonthIdx(Number(v))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_FULL.map((m, i) => (
                    <SelectItem key={i} value={String(i)}>{m} {fy}{months.includes(i) ? " (already exists)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {duplicate && (
                <p className="text-[11px] text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> This month already exists. Confirming will keep the column and (if a CSV is provided) overwrite cell values.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Upload CSV/XLSX (optional)</Label>
              <p className="text-[11px] text-muted-foreground">Two columns: <code>Code,Amount</code></p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="text-xs"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setCsvFile(f); setCsvRows(null);
                  if (f) parseCsv(f);
                }}
              />
              {csvRows && (
                <div className="mt-2 rounded border border-border max-h-48 overflow-auto text-[11px]">
                  <table className="w-full">
                    <thead className="bg-muted/40">
                      <tr><th className="p-1 text-left">Code</th><th className="p-1 text-right">Amount</th><th className="p-1">Status</th></tr>
                    </thead>
                    <tbody>
                       {csvRows.map((r, i) => (
                        <tr key={i} className={r.known ? "" : "bg-destructive/10"}>
                           <td className="p-1"><BudgetCode code={r.code} /></td>
                          <td className="p-1 text-right font-mono">{fmtMoney(r.amount)}</td>
                          <td className="p-1 text-center">{r.known ? "OK" : "Unknown code"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-1 text-muted-foreground">
                    {csvRows.filter(r => r.known).length} matched · {csvRows.filter(r => !r.known).length} unknown (skipped)
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={busy}>Cancel</Button>
            {csvFile ? (
              <Button onClick={confirm} disabled={busy}>
                <Upload className="h-3 w-3 mr-1" />Add & Import
              </Button>
            ) : (
              <Button onClick={enterManually} disabled={busy || duplicate}>
                <Plus className="h-3 w-3 mr-1" />Enter Manually
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const totalCols = 1 + 2 + 2 + months.length * 2 + 3;
  const fmtPct = (n: number) =>
    new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + "%";
  // Only pure-numeric (parent-level) codes carry an Annual Appropriation /
  // % Allocated. Sub-item codes like "22020302(a)" are blank in those cols.
  const isParentCode = (code: string) => /^\d+$/.test(code ?? "");
  const annualTotal = useMemo(
    () => sorted.reduce((s, r) => s + (isParentCode(r.code) ? getAnnualAppropriation2026(r.code) : 0), 0),
    [sorted],
  );
  const pctTotal = useMemo(
    () => sorted.reduce((s, r) => s + (isParentCode(r.code) ? getPercentAllocated2026(r.code) : 0), 0),
    [sorted],
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[13px] font-semibold flex items-center gap-2">
            Balances by Code
            {isReadOnly && <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground"><Lock className="h-3 w-3" /> Archive</span>}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            One row per sub-item code · {isReadOnly ? "Read-only archive view." : "Click any monthly cell to edit. Enter to save, Esc to cancel."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Fiscal Year</span>
          <Select value={String(fy)} onValueChange={(v) => setFy(Number(v))}>
            <SelectTrigger className="h-8 w-[110px] text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-[11px] text-muted-foreground ml-2">Month</span>
          <Select
            value={monthFilter === "ALL" ? "ALL" : String(monthFilter)}
            onValueChange={(v) => setMonthFilter(v === "ALL" ? "ALL" : Number(v))}
          >
            <SelectTrigger className="h-8 w-[150px] text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Months</SelectItem>
              {MONTH_FULL.map((m, i) => (
                <SelectItem key={i} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isReadOnly && (
            <Button size="sm" className="h-8" onClick={() => setAddOpen(true)}>
              <Plus className="h-3 w-3 mr-1" /> Add Month
            </Button>
          )}
        </div>
      </div>
      {draftMonth != null && (
        <div className="px-4 py-2 border-b border-border bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between gap-3">
          <div className="text-[12px]">
            <span className="font-semibold">Draft column:</span> {MONTH_FULL[draftMonth]} {fy} ·
            <span className="text-muted-foreground ml-1">Type values in the highlighted column. Press Enter/Tab to move to the next row. Totals update live.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7" onClick={cancelDraft} disabled={savingDraft}>
              <X className="h-3 w-3 mr-1" />Cancel
            </Button>
            <Button size="sm" className="h-7" onClick={saveDraft} disabled={savingDraft}>
              <Check className="h-3 w-3 mr-1" />{savingDraft ? "Saving…" : "Save Column"}
            </Button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto relative">
        <table className="w-full text-[12.5px] border-separate border-spacing-0">
          <thead className="text-[10.5px] uppercase tracking-wider text-muted-foreground bg-muted/30">
            <tr>
              <th rowSpan={2} className="p-2 text-left sticky left-0 z-30 bg-muted/95 shadow-[1px_0_0_hsl(var(--border))] w-[44px] min-w-[44px]">S/N</th>
              <th rowSpan={2} className="p-2 text-left sticky left-[44px] z-30 bg-muted/95 shadow-[1px_0_0_hsl(var(--border))] cursor-pointer select-none" onClick={() => onSort("code")}>Code</th>
              <th rowSpan={2} className="p-2 text-left sticky left-[156px] z-30 bg-muted/95 shadow-[1px_0_0_hsl(var(--border))] min-w-[220px] cursor-pointer select-none" onClick={() => onSort("name")}>Expenditure Item</th>
              <th rowSpan={2} className="p-2 text-right border-l border-border min-w-[140px]">Annual Appropriation</th>
              <th rowSpan={2} className="p-2 text-right border-l border-border min-w-[110px]">% Allocated</th>
              {months.map(mi => (
                <th key={`g${mi}`} colSpan={2} className={`p-1 text-center border-l border-border ${mi === draftMonth ? "bg-amber-200/60 dark:bg-amber-900/40" : "bg-muted/50"}`}>
                  {MONTH_LABELS[mi]} {fy}
                  {mi === draftMonth && <span className="ml-1 text-[9px] uppercase tracking-wider text-amber-800 dark:text-amber-300">· Draft</span>}
                </th>
              ))}
              <Th k="total" label="Total Budget" num />
              <Th k="totalActual" label="Total Actual" num />
              <Th k="balance" label="Balance Yet To Distribute" num />
            </tr>
            <tr>
              {months.flatMap(mi => [
                <th key={`bh${mi}`} className="p-1 text-right border-l border-border cursor-pointer select-none" onClick={() => onSort(`m${mi}` as SortKey)}>Budget</th>,
                <th key={`ah${mi}`} className="p-1 text-right cursor-pointer select-none" onClick={() => onSort(`s${mi}` as SortKey)}>Actual</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={totalCols} className="p-6 text-center text-[12px] text-muted-foreground italic">No AIE records for {fy}.</td></tr>
            ) : sorted.map((r, idx) => (
              <tr key={r.code} data-row-code={r.code} className="group border-t border-border hover:bg-muted/20">
                <td className="p-2 text-[12px] text-muted-foreground sticky left-0 z-20 bg-card group-hover:bg-muted/30 shadow-[1px_0_0_hsl(var(--border))] w-[44px] min-w-[44px] text-center">{idx + 1}</td>
                <td className="p-2 text-[12px] sticky left-[44px] z-20 bg-card group-hover:bg-muted/30 shadow-[1px_0_0_hsl(var(--border))] w-[112px] min-w-[112px]"><BudgetCode code={r.code} /></td>
                <td className="p-2 text-muted-foreground sticky left-[156px] z-20 bg-card group-hover:bg-muted/30 shadow-[1px_0_0_hsl(var(--border))] min-w-[220px]">{r.name || <span className="italic opacity-60">—</span>}</td>
                <td className="p-2 text-right font-mono border-l border-border">{isParentCode(r.code) ? fmtMoney(getAnnualAppropriation2026(r.code)) : <span className="text-muted-foreground">—</span>}</td>
                <td className="p-2 text-right font-mono border-l border-border text-muted-foreground">{isParentCode(r.code) ? fmtPct(getPercentAllocated2026(r.code)) : "—"}</td>
               {months.flatMap(mi => {
                  const v = r.months[mi] || 0;
                  const sv = r.spent[mi] || 0;
                  const cellKey = `${r.code}:${mi}`;
                  const isDraftCol = mi === draftMonth;
                  const budgetCell = isDraftCol ? (
                    <td key={`b${mi}`} className="p-1 text-right font-mono border-l border-border bg-amber-50 dark:bg-amber-950/20">
                      <input
                        type="text"
                        inputMode="decimal"
                        data-draft-code={r.code}
                        defaultValue={draftValues[r.code] ? String(draftValues[r.code]) : ""}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/,/g, "").trim();
                          const n = Number(cleaned);
                          setDraftValues(s => ({ ...s, [r.code]: Number.isFinite(n) ? n : 0 }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
                            e.preventDefault();
                            const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-draft-code]'));
                            const idx = inputs.indexOf(e.currentTarget);
                            const nextEl = inputs[idx + 1];
                            if (nextEl) nextEl.focus();
                            else (e.currentTarget as HTMLInputElement).blur();
                          }
                        }}
                        className="w-full bg-transparent text-right font-mono tabular-nums outline-none border border-amber-300 dark:border-amber-700 focus:border-primary rounded px-1 py-0.5"
                        placeholder="0"
                      />
                    </td>
                  ) : isReadOnly ? (
                    <td key={`b${mi}`} className="p-2 text-right font-mono border-l border-border">{fmtMoney(v)}</td>
                  ) : (
                    <td key={`b${mi}`} className="p-0 text-right font-mono border-l border-border">
                      <ContextMenu>
                        <ContextMenuTrigger asChild>
                          <div className="px-1 py-1">
                            <MoneyInput value={v} disabled={saving === cellKey || clearing === cellKey} onCommit={(n) => saveMonth(r.code, mi, n, v)} />
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem
                            disabled={v === 0 || clearing === cellKey}
                            onSelect={() => clearCell(r.code, mi)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Eraser className="h-3.5 w-3.5 mr-2" />
                            Clear value
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    </td>
                  );
                  const actualLocked = isReadOnly || isAuthoritativeActualMonth(fy, mi);
                  const actualCell = actualLocked ? (
                    <td key={`a${mi}`} className="p-2 text-right font-mono">{fmtMoney(sv)}</td>
                  ) : (
                    <td key={`a${mi}`} className="p-1 text-right font-mono">
                      <MoneyInput value={sv} onCommit={(n) => saveSpent(r.code, mi, n, sv)} />
                    </td>
                  );
                  return [budgetCell, actualCell];
                })}
                <td className="p-2 text-right font-mono font-semibold">{fmtMoney(r.total)}</td>
                <td className="p-2 text-right font-mono font-semibold">{fmtMoney(r.totalActual)}</td>
                <td className={`p-2 text-right font-mono font-semibold ${r.balance < 0 ? "text-destructive" : ""}`}>
                  {fmtMoney(r.balance)}
                </td>
              </tr>
            ))}
          </tbody>
          {sorted.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                <td className="p-2 sticky left-0 z-20 bg-muted/80 shadow-[1px_0_0_hsl(var(--border))] text-center text-muted-foreground">—</td>
                <td className="p-2 sticky left-[44px] z-20 bg-muted/80 shadow-[1px_0_0_hsl(var(--border))]">Totals ({sorted.length} code{sorted.length === 1 ? "" : "s"})</td>
                <td className="p-2 sticky left-[156px] z-20 bg-muted/80 shadow-[1px_0_0_hsl(var(--border))]" />
                <td className="p-2 text-right font-mono border-l border-border">{fmtMoney(annualTotal)}</td>
                <td className="p-2 text-right font-mono border-l border-border">{fmtPct(pctTotal)}</td>
                {months.flatMap(mi => [
                  <td key={`bt${mi}`} className="p-2 text-right font-mono border-l border-border">{fmtMoney(totals.months[mi] || 0)}</td>,
                  <td key={`at${mi}`} className="p-2 text-right font-mono">{fmtMoney(totals.spent[mi] || 0)}</td>,
                ])}
                <td className="p-2 text-right font-mono">{fmtMoney(totals.total)}</td>
                <td className="p-2 text-right font-mono">{fmtMoney(totals.totalActual)}</td>
                <td className={`p-2 text-right font-mono ${totals.balance < 0 ? "text-destructive" : ""}`}>{fmtMoney(totals.balance)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <AddMonthDialog />
    </div>
  );
}