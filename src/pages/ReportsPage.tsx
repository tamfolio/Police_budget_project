import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listAies } from "@/lib/aiesApi";
import { listFundInflows } from "@/lib/fundInflowsApi";
import { getBudgetCodeReference } from "@/lib/budgetCodesApi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FileDown, FileText, Printer, RefreshCw, X, ChevronRight, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  fmtN, fmtInt, fromCents, sumCents, toCents,
  buildCsv, downloadBlob, printHtml, generatePdfReport, fmtPdfNgn,
} from "@/lib/reportUtils";
import { AieBalancesSummary } from "@/components/AieBalancesSummary";
import { SEED_PERIODS, SEED_SUMMARY_TABLE1, type Period, type SummaryRow, type ZoneGroupKey } from "@/data/distributionBreakdown";
import { resolveBudgetCode, toFullCode } from "@/lib/budgetCodes";
import { BudgetCode } from "@/components/BudgetCode";
import {
  loadMonthlyDistributed,
  saveMonthlyDistributed,
} from "@/data/fy2026Targets";
import { AIE_TOTAL_2026 } from "@/data/fy2026Targets";
import {
  isTotalRow, zoneAmountColumnCount,
  useDistributionBreakdown, aggregateAllDistributionByCode,
} from "@/lib/distributionAggregation";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

type SubItem = { code: string; name: string; category_code: string };
type FundInflow = { id: string; fiscal_year: number; inflow_date: string; amount: number; status: string };
type Aie = {
  id: string; aie_no: string; fiscal_year: number; issue_date: string;
  recipient_unit: string; sub_item_code: string | null; amount: number; status: string;
};
type AieLine = { id: string; aie_id: string; sub_item_code: string; amount: number };
type TxnType = "AIE" | "Distribution" | "Inflow";
type Filters = {
  dateFrom: string; dateTo: string;
  code: string; formation: string;
  txnTypes: TxnType[];
};

const GROUP_KEYS: ZoneGroupKey[] = ["zone1_6", "zone7_12", "zone13_17"];
const DIST_STORAGE_KEY = "npf:distributionBreakdown:v5";
const SUMMARY_STORAGE_KEY = "npf:distributionSummary:v2";
const REPORTS_FILTERS_KEY = "reports.filters.v1";
const DEFAULT_FILTERS: Filters = {
  dateFrom: "", dateTo: "", code: "ALL", formation: "ALL",
  txnTypes: ["AIE", "Distribution", "Inflow"],
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = ["january","february","march","april","may","june","july","august","september","october","november","december"];

function loadPeriods(): Period[] {
  try {
    const raw = localStorage.getItem(DIST_STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Period[];
      if (Array.isArray(p) && p.length) return p;
    }
  } catch {}
  return SEED_PERIODS;
}

function loadSummaryRows(): SummaryRow[] {
  try {
    const raw = localStorage.getItem(SUMMARY_STORAGE_KEY);
    if (raw) {
      const store = JSON.parse(raw) as Record<string, SummaryRow[]>;
      if (store && typeof store === "object") {
        // Use the latest period's rows (sorted by id).
        const keys = Object.keys(store).sort();
        const lastKey = keys[keys.length - 1];
        if (lastKey && Array.isArray(store[lastKey]) && store[lastKey].length) return store[lastKey];
      }
    }
  } catch {}
  return SEED_SUMMARY_TABLE1.map(r => ({ ...r }));
}

function extractStateFromName(name: string): string {
  const states = ["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"];
  const u = name.toUpperCase();
  for (const s of states) if (u.includes(s.toUpperCase())) return s;
  return "—";
}

export default function ReportsPage() {
  useEffect(() => { document.title = "Reports – NPF BMS"; }, []);
  const [loading, setLoading] = useState(true);
  const [aies, setAies] = useState<Aie[]>([]);
  const [aieLines, setAieLines] = useState<AieLine[]>([]);
  const [subs, setSubs] = useState<SubItem[]>([]);
  const [inflows, setInflows] = useState<FundInflow[]>([]);
  const [periods, setPeriods] = useState<Period[]>(loadPeriods);
  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>(loadSummaryRows);
  const distBreakdown = useDistributionBreakdown();

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === DIST_STORAGE_KEY) setPeriods(loadPeriods());
      if (e.key === SUMMARY_STORAGE_KEY) setSummaryRows(loadSummaryRows());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const [filters, setFilters] = useState<Filters>(() => {
    try { const r = localStorage.getItem(REPORTS_FILTERS_KEY); if (r) return { ...DEFAULT_FILTERS, ...JSON.parse(r) }; } catch {}
    return DEFAULT_FILTERS;
  });
  useEffect(() => {
    try { localStorage.setItem(REPORTS_FILTERS_KEY, JSON.stringify(filters)); } catch {}
  }, [filters]);

  const refresh = async () => {
    setLoading(true);
    const [apiAies, ref, fiData] = await Promise.all([
      listAies(),
      getBudgetCodeReference(),
      listFundInflows(),
    ]);
    setAies(apiAies.map(a => ({
      id: a.id,
      aie_no: a.aieNo,
      fiscal_year: a.fiscalYear,
      issue_date: a.issueDate,
      recipient_unit: a.recipientUnit,
      sub_item_code: a.lineItems.length === 1 ? a.lineItems[0].subItemCode : null,
      amount: Number(a.totalAmount || 0),
      status: a.status,
    })));
    setAieLines(apiAies.flatMap(a =>
      a.lineItems.map(l => ({ id: `${a.id}:${l.subItemCode}`, aie_id: a.id, sub_item_code: l.subItemCode, amount: Number(l.amount) }))
    ));
    setSubs(ref.categories.flatMap(c => (c.subItems ?? []).map(s => ({ code: s.code, name: s.name, category_code: s.categoryCode }))));
    setInflows(fiData.map(r => ({
      id: r.id,
      fiscal_year: r.fiscalYear,
      inflow_date: r.inflowDate,
      amount: Number(r.amount),
      status: r.status,
    })));
    setPeriods(loadPeriods());
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const subByCode = useMemo(() => Object.fromEntries(subs.map(s => [s.code, s])), [subs]);
  const linesByAie = useMemo(() => {
    const m: Record<string, AieLine[]> = {};
    aieLines.forEach(l => { (m[l.aie_id] ||= []).push(l); });
    return m;
  }, [aieLines]);

  // ===== Source-of-truth totals =====
  // AIE total mirrors the canonical FY2026 AIE Spent total used in
  // Expenditures / AIE Records (₦14,954,843,775.97).
  const aieSourceTotal = AIE_TOTAL_2026;
  // Distribution total = Zones + Formation + Schools (live, dynamic).
  const distSourceTotal = distBreakdown.total;
  // Per-record AIE scaling factor so per-code AIE roll-ups reconcile to
  // the canonical FY2026 AIE Spent total.
  const aieRawTotal = useMemo(() => {
    let t = 0;
    aieLines.forEach(l => { t += Number(l.amount || 0); });
    aies.forEach(a => {
      if ((linesByAie[a.id] || []).length === 0) t += Number(a.amount || 0);
    });
    return t;
  }, [aies, aieLines, linesByAie]);
  const aieScaleFactor = aieRawTotal > 0 ? AIE_TOTAL_2026 / aieRawTotal : 1;

  const inflowSourceTotal = useMemo(
    () => inflows.filter(r => r.status === "APPROVED").reduce((t, r) => t + Number(r.amount || 0), 0),
    [inflows]
  );

  // ===== Filter predicates =====
  const inDateRange = (iso: string | null | undefined) => {
    if (!iso) return !filters.dateFrom && !filters.dateTo;
    if (filters.dateFrom && iso < filters.dateFrom) return false;
    if (filters.dateTo && iso > filters.dateTo) return false;
    return true;
  };
  const matchCode = (code: string | null | undefined) =>
    filters.code === "ALL" || toFullCode(code) === toFullCode(filters.code);
  const matchFormation = (text: string | null | undefined) => {
    if (filters.formation === "ALL") return true;
    return (text ?? "").toLowerCase().includes(filters.formation.toLowerCase());
  };
  const useAie = filters.txnTypes.includes("AIE");
  const useDist = filters.txnTypes.includes("Distribution");
  const useInflow = filters.txnTypes.includes("Inflow");

  const filteredAies = useMemo(() => {
    if (!useAie) return [];
    return aies.filter(a => {
      if (!inDateRange(a.issue_date)) return false;
      if (!matchFormation(a.recipient_unit)) return false;
      if (filters.code !== "ALL") {
        const lines = linesByAie[a.id] || [];
        const codes = lines.length ? lines.map(l => l.sub_item_code) : [a.sub_item_code ?? ""];
        if (!codes.includes(filters.code)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aies, linesByAie, filters, useAie]);

  const filteredAieByCode = useMemo(() => {
    const m: Record<string, number> = {};
    if (!useAie) return m;
    for (const a of filteredAies) {
      const lines = linesByAie[a.id] || [];
      if (lines.length) {
        for (const l of lines) {
          if (!matchCode(l.sub_item_code)) continue;
          const k = toFullCode(l.sub_item_code);
          m[k] = (m[k] || 0) + Number(l.amount || 0) * aieScaleFactor;
        }
      } else if (a.sub_item_code) {
        if (!matchCode(a.sub_item_code)) continue;
        const k = toFullCode(a.sub_item_code);
        m[k] = (m[k] || 0) + Number(a.amount || 0) * aieScaleFactor;
      }
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAies, linesByAie, filters, useAie, aieScaleFactor]);

  type DistEntry = { period: string; formation: string; code: string; desc: string; amount: number; monthIdx: number };
  const distEntries = useMemo(() => {
    if (!useDist) return [] as DistEntry[];
    const out: DistEntry[] = [];
    for (const p of periods) {
      const amountColumns = zoneAmountColumnCount(p);
      const m = /(January|February|March|April|May|June|July|August|September|October|November|December)/.exec(p.label);
      const monthIdx = m ? MONTH_NAMES.indexOf(m[1].toLowerCase()) : -1;
      for (const gk of GROUP_KEYS) {
        for (const f of (p.data[gk] || [])) {
          if (!matchFormation(f.name)) continue;
          for (const it of f.items) {
            if (isTotalRow(it)) continue;
            const code = toFullCode((it.code || "").trim());
            if (!matchCode(code)) continue;
            const sum = (it.amounts || []).slice(0, amountColumns).reduce((s, a) => s + Number(a || 0), 0);
            if (!sum) continue;
            out.push({ period: p.label, formation: f.name, code, desc: it.desc, amount: sum, monthIdx });
          }
        }
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periods, filters, useDist]);

  const filteredInflows = useMemo(() => {
    if (!useInflow) return [];
    return inflows.filter(r => r.status === "APPROVED" && inDateRange(r.inflow_date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inflows, filters, useInflow]);

  // ===== Monthly Release =====
  const monthIdxOf = (iso: string) => new Date(iso + "T00:00:00").getMonth();
  // Editable per-month Distributed values. Defaults to the canonical
  // FY2026 position: January = ₦2,337,718,654.11, all other months = 0.
  const [monthlyDistributed, setMonthlyDistributed] = useState<number[]>(() => loadMonthlyDistributed());
  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const commitEdit = (i: number) => {
    const n = Number(editingValue.replace(/,/g, ""));
    if (Number.isFinite(n) && n >= 0) {
      const next = monthlyDistributed.slice();
      next[i] = n;
      setMonthlyDistributed(next);
      saveMonthlyDistributed(next);
    }
    setEditingMonth(null);
  };
  const monthlyRows = useMemo(() => {
    // When a formation filter is active, the Distributed column reflects
    // only that formation's contribution (summed from filtered distEntries).
    // Otherwise we use the editable per-month overrides.
    let distByMonth: number[];
    if (filters.formation !== "ALL" && useDist) {
      distByMonth = Array.from({ length: 12 }, () => 0);
      for (const e of distEntries) {
        if (e.monthIdx >= 0 && e.monthIdx < 12) distByMonth[e.monthIdx] += e.amount;
      }
    } else {
      distByMonth = monthlyDistributed.slice();
    }
    return MONTHS.map((m, i) => {
      const aiesM = filteredAies.filter(r => monthIdxOf(r.issue_date) === i);
      const inM = filteredInflows.filter(r => monthIdxOf(r.inflow_date) === i);
      return {
        month: m,
        releaseC: sumCents(aiesM.map(r => Number(r.amount || 0))),
        releaseCount: aiesM.length,
        inflowC: sumCents(inM.map(r => Number(r.amount || 0))),
        distC: toCents(distByMonth[i]),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAies, filteredInflows, monthlyDistributed, distEntries, filters.formation, useDist]);
  const monthlyTotals = useMemo(() => ({
    releaseC: monthlyRows.reduce((a, r) => a + r.releaseC, 0),
    inflowC: monthlyRows.reduce((a, r) => a + r.inflowC, 0),
    distC: monthlyRows.reduce((a, r) => a + r.distC, 0),
    count: monthlyRows.reduce((a, r) => a + r.releaseCount, 0),
  }), [monthlyRows]);

  // ===== Line Item =====
  const lineItemRows = useMemo(() => {
    const distByCode: Record<string, number> = {};
    if (useDist) {
      if (filters.formation === "ALL") {
        // Aggregate across Zones + Formation + Schools (all sub-tabs).
        const agg = aggregateAllDistributionByCode();
        for (const [k, v] of Object.entries(agg)) {
          if (!matchCode(k)) continue;
          distByCode[k] = (distByCode[k] || 0) + v;
        }
      } else {
        // A formation filter only meaningfully applies to Zones data.
        for (const e of distEntries) distByCode[e.code] = (distByCode[e.code] || 0) + e.amount;
      }
    }
    const codes = new Set<string>([...Object.keys(filteredAieByCode), ...Object.keys(distByCode)]);
    return Array.from(codes).filter(Boolean).map(code => ({
      code,
      name: subByCode[code]?.name ?? resolveBudgetCode(code).name ?? "—",
      total: (filteredAieByCode[code] || 0) + (distByCode[code] || 0),
    })).sort((a, b) => a.code.localeCompare(b.code));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAieByCode, distEntries, subByCode, filters, useDist]);
  const lineItemTotal = useMemo(() => lineItemRows.reduce((t, r) => t + r.total, 0), [lineItemRows]);

  // ===== Distribution Summary (replaces former Formation roll-up) =====
  const [formationStateFilter, setFormationStateFilter] = useState<string>("ALL");

  // Filter the Summary rows by both the top-level Formation/State filter
  // (free-text contains match) and the inner State select.
  const summaryFiltered = useMemo(() => {
    const q = filters.formation === "ALL" ? "" : filters.formation.toLowerCase();
    return summaryRows
      .map((r, idx) => ({ ...r, _idx: idx, state: extractStateFromName(r.name) }))
      .filter(r => {
        if (formationStateFilter !== "ALL" && r.state !== formationStateFilter) return false;
        if (q && !r.name.toLowerCase().includes(q)) return false;
        return true;
      });
  }, [summaryRows, formationStateFilter, filters.formation]);
  const summaryTotal = useMemo(
    () => summaryFiltered.reduce((s, r) => s + Number(r.allocation || 0), 0),
    [summaryFiltered],
  );

  const allStatesForForms = useMemo(() => {
    const set = new Set<string>();
    summaryRows.forEach(r => {
      const s = extractStateFromName(r.name);
      if (s && s !== "—") set.add(s);
    });
    return Array.from(set).sort();
  }, [summaryRows]);

  // ===== Filter subtitle =====
  const filterSubtitle = useMemo(() => {
    const parts: string[] = [];
    if (filters.dateFrom || filters.dateTo) parts.push(`Date ${filters.dateFrom || "…"} → ${filters.dateTo || "…"}`);
    if (filters.code !== "ALL") parts.push(`Code ${filters.code}`);
    if (filters.formation !== "ALL") parts.push(`Formation ${filters.formation}`);
    if (filters.txnTypes.length !== 3) parts.push(`Type ${filters.txnTypes.join("+")}`);
    return parts.length ? `Filtered by: ${parts.join(" | ")}` : "No filters applied";
  }, [filters]);
  const meta = () => [`Generated: ${new Date().toLocaleString()}`, filterSubtitle];

  // ===== Exports =====
  const monthlyCsv = () => downloadBlob(buildCsv(
    ["Month", "Inflows", "Releases (AIE)", "Count", "Distributed"],
    [
      ...monthlyRows.map(r => [r.month, fromCents(r.inflowC).toFixed(2), fromCents(r.releaseC).toFixed(2), r.releaseCount, fromCents(r.distC).toFixed(2)]),
      ["TOTAL", fromCents(monthlyTotals.inflowC).toFixed(2), fromCents(monthlyTotals.releaseC).toFixed(2), monthlyTotals.count, fromCents(monthlyTotals.distC).toFixed(2)],
    ],
  ), `monthly-release.csv`);
  const monthlyPdf = () => generatePdfReport({
    title: "Monthly Release Summary", subtitle: filterSubtitle, meta: meta(),
    filename: "monthly-release.pdf",
    sections: [{
      title: "Per-Month Totals",
      headers: ["Month", "Inflows", "Releases (AIE)", "Count", "Distributed"],
      widths: [70, 110, 110, 60, 110],
      rows: [
        ...monthlyRows.map(r => [r.month, fmtPdfNgn(fromCents(r.inflowC)), fmtPdfNgn(fromCents(r.releaseC)), String(r.releaseCount), fmtPdfNgn(fromCents(r.distC))]),
        ["TOTAL", fmtPdfNgn(fromCents(monthlyTotals.inflowC)), fmtPdfNgn(fromCents(monthlyTotals.releaseC)), String(monthlyTotals.count), fmtPdfNgn(fromCents(monthlyTotals.distC))],
      ],
    }],
  });
  const monthlyPrint = () => {
    const rows = monthlyRows.map(r => `<tr><td>${r.month}</td><td class="num">${fmtN(fromCents(r.inflowC))}</td><td class="num">${fmtN(fromCents(r.releaseC))}</td><td class="num">${fmtInt(r.releaseCount)}</td><td class="num">${fmtN(fromCents(r.distC))}</td></tr>`).join("");
    const total = `<tr class="total"><td>TOTAL</td><td class="num">${fmtN(fromCents(monthlyTotals.inflowC))}</td><td class="num">${fmtN(fromCents(monthlyTotals.releaseC))}</td><td class="num">${fmtInt(monthlyTotals.count)}</td><td class="num">${fmtN(fromCents(monthlyTotals.distC))}</td></tr>`;
    printHtml("Monthly Release",
      `<h1>Monthly Release Summary</h1><div class="meta">${filterSubtitle} · ${new Date().toLocaleString()}</div>
       <table><thead><tr><th>Month</th><th class="num">Inflows</th><th class="num">Releases (AIE)</th><th class="num">Count</th><th class="num">Distributed</th></tr></thead><tbody>${rows}${total}</tbody></table>`);
  };

  const lineItemCsv = () => downloadBlob(buildCsv(
    ["Code", "Expenditure Item", "Total Amount (NGN)"],
    [...lineItemRows.map(r => [toFullCode(r.code), r.name, r.total.toFixed(2)]), ["TOTAL", "", lineItemTotal.toFixed(2)]],
  ), `line-item.csv`);
  const lineItemPdf = () => generatePdfReport({
    title: "Line Item Statement", subtitle: filterSubtitle, meta: meta(),
    filename: "line-item.pdf",
    sections: [{
      title: "Per Budget Code",
      headers: ["Code", "Expenditure Item", "Total Amount"],
      widths: [70, 280, 110],
      rows: [...lineItemRows.map(r => [toFullCode(r.code), r.name, fmtPdfNgn(r.total)]), ["TOTAL", "", fmtPdfNgn(lineItemTotal)]],
    }],
  });
  const lineItemPrint = () => {
    const rows = lineItemRows.map(r => `<tr><td>${toFullCode(r.code)}</td><td>${r.name}</td><td class="num">${fmtN(r.total)}</td></tr>`).join("");
    printHtml("Line Item",
      `<h1>Line Item Statement</h1><div class="meta">${filterSubtitle} · ${new Date().toLocaleString()}</div>
       <table><thead><tr><th>Code</th><th>Expenditure Item</th><th class="num">Total Amount</th></tr></thead><tbody>${rows}<tr class="total"><td>TOTAL</td><td></td><td class="num">${fmtN(lineItemTotal)}</td></tr></tbody></table>`);
  };

  const formationCsv = () => downloadBlob(buildCsv(
    ["S/No.", "Commands/Formations", "Allocation (NGN)"],
    [...summaryFiltered.map((r, i) => [String(i + 1), r.name, Number(r.allocation || 0).toFixed(2)]), ["", "GRAND TOTAL", summaryTotal.toFixed(2)]],
  ), `distribution-summary.csv`);
  const formationPdf = () => generatePdfReport({
    title: "Distribution Summary", subtitle: filterSubtitle, meta: meta(),
    filename: "distribution-summary.pdf",
    sections: [{
      title: "Commands / Formations",
      headers: ["S/No.", "Commands/Formations", "Allocation"],
      widths: [40, 330, 110],
      rows: [...summaryFiltered.map((r, i) => [String(i + 1), r.name, fmtPdfNgn(Number(r.allocation || 0))]), ["", "GRAND TOTAL", fmtPdfNgn(summaryTotal)]],
    }],
  });
  const formationPrint = () => {
    const rows = summaryFiltered.map((r, i) => `<tr><td>${i + 1}</td><td>${r.name}</td><td class="num">${fmtN(Number(r.allocation || 0))}</td></tr>`).join("");
    printHtml("Distribution Summary",
      `<h1>Distribution Summary</h1><div class="meta">${filterSubtitle} · ${new Date().toLocaleString()}</div>
       <table><thead><tr><th>S/No.</th><th>Commands/Formations</th><th class="num">Allocation</th></tr></thead><tbody>${rows}<tr class="total"><td></td><td>GRAND TOTAL</td><td class="num">${fmtN(summaryTotal)}</td></tr></tbody></table>`);
  };

  const ledgerCsv = () => downloadBlob(buildCsv(
    ["Issue Date", "AIE No", "Recipient", "Code", "Expenditure Item", "Amount (NGN)"],
    [
      ...filteredAies.map(r => [r.issue_date, r.aie_no, r.recipient_unit, toFullCode(r.sub_item_code), subByCode[r.sub_item_code ?? ""]?.name ?? resolveBudgetCode(r.sub_item_code).name ?? "—", Number(r.amount).toFixed(2)]),
      ["", "", "", "", "TOTAL", filteredAies.reduce((t, r) => t + Number(r.amount || 0), 0).toFixed(2)],
    ],
  ), `aie-ledger.csv`);
  const ledgerPdf = () => generatePdfReport({
    title: "AIE Ledger", subtitle: filterSubtitle, meta: meta(),
    filename: "aie-ledger.pdf",
    sections: [{
      title: "AIE Records (filtered)",
      headers: ["Date", "AIE No", "Recipient", "Code", "Amount"],
      widths: [60, 80, 180, 60, 100],
      rows: [
        ...filteredAies.map(r => [r.issue_date, r.aie_no, r.recipient_unit, toFullCode(r.sub_item_code) || "—", fmtPdfNgn(Number(r.amount))]),
        ["", "", "", "TOTAL", fmtPdfNgn(filteredAies.reduce((t, r) => t + Number(r.amount || 0), 0))],
      ],
    }],
  });
  const ledgerPrint = () => {
    const rows = filteredAies.map(r => `<tr><td>${r.issue_date}</td><td>${r.aie_no}</td><td>${r.recipient_unit}</td><td>${toFullCode(r.sub_item_code) || "—"}</td><td class="num">${fmtN(Number(r.amount))}</td></tr>`).join("");
    const tot = filteredAies.reduce((t, r) => t + Number(r.amount || 0), 0);
    printHtml("AIE Ledger",
      `<h1>AIE Ledger</h1><div class="meta">${filterSubtitle} · ${new Date().toLocaleString()}</div>
       <table><thead><tr><th>Date</th><th>AIE No</th><th>Recipient</th><th>Code</th><th class="num">Amount</th></tr></thead><tbody>${rows}<tr class="total"><td colspan="4">TOTAL</td><td class="num">${fmtN(tot)}</td></tr></tbody></table>`);
  };

  // ===== UI =====
  const setF = (patch: Partial<Filters>) => setFilters(f => ({ ...f, ...patch }));
  const clearFilters = () => { setFilters(DEFAULT_FILTERS); setFormationStateFilter("ALL"); };

  const codeOptions = useMemo(() => subs.slice().sort((a, b) => a.code.localeCompare(b.code)), [subs]);
  // Formation + state options, populated exclusively from formations/states
  // that actually have records in the underlying distribution or AIE data.
  const formationOptions = useMemo(() => {
    const formationSet = new Set<string>();
    const stateSet = new Set<string>();
    for (const p of periods) {
      const amountColumns = zoneAmountColumnCount(p);
      for (const gk of GROUP_KEYS) {
        for (const f of (p.data[gk] || [])) {
          const hasRecord = (f.items || []).some(it =>
            !isTotalRow(it) &&
            (it.amounts || []).slice(0, amountColumns).some(a => Number(a || 0) !== 0)
          );
          if (hasRecord) {
            formationSet.add(f.name);
            const st = extractStateFromName(f.name);
            if (st && st !== "—") stateSet.add(st);
          }
        }
      }
    }
    for (const a of aies) {
      const r = (a.recipient_unit || "").trim();
      if (!r) continue;
      formationSet.add(r);
      const st = extractStateFromName(r);
      if (st && st !== "—") stateSet.add(st);
    }
    return Array.from(new Set([...stateSet, ...formationSet])).sort();
  }, [periods, aies]);

  const ExportBar = ({ onCsv, onPdf, onPrint }: { onCsv: () => void; onPdf: () => void; onPrint: () => void; }) => (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={onCsv}><FileDown className="h-3.5 w-3.5" /> CSV</Button>
      <Button size="sm" variant="outline" onClick={onPdf}><FileText className="h-3.5 w-3.5" /> PDF</Button>
      <Button size="sm" variant="outline" onClick={onPrint}><Printer className="h-3.5 w-3.5" /> Print</Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-serif">Reports</h1>
          <p className="text-[12px] text-muted-foreground mt-1">Source-synced totals · Filtered sub-tabs · Filter-aware exports.</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => { refresh().then(() => toast.success("Reports refreshed")); }} disabled={loading}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="AIEs" value={fmtN(aieSourceTotal)} hint="Total AIE expenditure" />
        <SummaryCard label="Expenditures" value={fmtN(aieSourceTotal + distSourceTotal)} hint="AIE + Distribution" emphasize />
        <SummaryCard label="Distributions (APPROVED)" value={fmtN(distSourceTotal)} hint={`Zones ${fmtN(distBreakdown.zones)} · Form ${fmtN(distBreakdown.formation)} · Sch ${fmtN(distBreakdown.schools)}`} />
        <SummaryCard label="Inflows (APPROVED)" value={fmtN(inflowSourceTotal)} hint="Approved inflows total" />
      </div>

      <div className="rounded-lg border border-border bg-card p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Filters</div>
          <Button size="sm" variant="ghost" onClick={clearFilters}><X className="h-3.5 w-3.5" /> Clear filters</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">From</Label>
            <Input type="date" value={filters.dateFrom} onChange={(e) => setF({ dateFrom: e.target.value })} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">To</Label>
            <Input type="date" value={filters.dateTo} onChange={(e) => setF({ dateTo: e.target.value })} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Budget Code</Label>
            <Select value={filters.code} onValueChange={(v) => setF({ code: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="ALL">All codes</SelectItem>
                {codeOptions.map(s => <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Formation / State</Label>
            <Select value={filters.formation} onValueChange={(v) => setF({ formation: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="ALL">All formations</SelectItem>
                {formationOptions.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Transaction Type</Label>
            <div className="flex items-center gap-3 h-9">
              {(["AIE", "Distribution", "Inflow"] as TxnType[]).map(t => (
                <label key={t} className="inline-flex items-center gap-1.5 text-[12px] cursor-pointer">
                  <Checkbox
                    checked={filters.txnTypes.includes(t)}
                    onCheckedChange={(c) => {
                      const has = filters.txnTypes.includes(t);
                      const next = c ? (has ? filters.txnTypes : [...filters.txnTypes, t]) : filters.txnTypes.filter(x => x !== t);
                      setF({ txnTypes: next as TxnType[] });
                    }}
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground">{filterSubtitle}</div>
      </div>

      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="flex w-full h-auto justify-start gap-0 rounded-none border-b border-border bg-transparent p-0">
          {[
            { v: "monthly", l: "Monthly Release" },
            { v: "lineitem", l: "Line Item" },
            { v: "formation", l: "Distribution Summary" },
            { v: "ledger", l: "AIE Ledger" },
          ].map(t => (
            <TabsTrigger
              key={t.v}
              value={t.v}
              className="flex-1 rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-[13px] font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              {t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="monthly" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-muted-foreground">AIE releases, inflows, and distributions per month.</p>
            <ExportBar onCsv={monthlyCsv} onPdf={monthlyPdf} onPrint={monthlyPrint} />
          </div>
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="bg-muted/40 text-[10.5px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 w-10">S/N</th>
                  <th className="text-left px-3 py-2">Month</th>
                  <th className="text-right px-3 py-2">Inflows</th>
                  <th className="text-right px-3 py-2">Releases (AIE)</th>
                  <th className="text-right px-3 py-2">Count</th>
                  <th className="text-right px-3 py-2">Distributed</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map((r, _i) => (
                  <tr key={r.month} className="border-t border-border">
                    <td className="px-3 py-1.5 text-xs text-muted-foreground tabular-nums">{_i + 1}</td>
                    <td className="px-3 py-1.5">{r.month}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{fmtN(fromCents(r.inflowC))}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{fmtN(fromCents(r.releaseC))}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{fmtInt(r.releaseCount)}</td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {editingMonth === MONTHS.indexOf(r.month) ? (
                        <Input
                          autoFocus
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => commitEdit(MONTHS.indexOf(r.month))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit(MONTHS.indexOf(r.month));
                            else if (e.key === "Escape") setEditingMonth(null);
                          }}
                          className="h-7 text-right font-mono text-[12.5px]"
                        />
                      ) : (
                        <ContextMenu>
                          <ContextMenuTrigger asChild>
                            <span className="block cursor-context-menu">{fmtN(fromCents(r.distC))}</span>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem
                              onClick={() => {
                                const idx = MONTHS.indexOf(r.month);
                                setEditingValue(String(monthlyDistributed[idx] ?? 0));
                                setEditingMonth(idx);
                              }}
                            >
                              Edit value
                            </ContextMenuItem>
                            <ContextMenuItem
                              onClick={() => {
                                const idx = MONTHS.indexOf(r.month);
                                const next = monthlyDistributed.slice();
                                next[idx] = 0;
                                setMonthlyDistributed(next);
                                saveMonthlyDistributed(next);
                              }}
                            >
                              Reset to 0
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-border bg-muted/30 font-semibold">
                  <td />
                  <td className="px-3 py-1.5">TOTAL</td>
                  <td className="px-3 py-1.5 text-right font-mono">{fmtN(fromCents(monthlyTotals.inflowC))}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{fmtN(fromCents(monthlyTotals.releaseC))}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{fmtInt(monthlyTotals.count)}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{fmtN(fromCents(monthlyTotals.distC))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="lineitem" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-muted-foreground">One row per budget code — AIE + distribution expenditure.</p>
            <ExportBar onCsv={lineItemCsv} onPdf={lineItemPdf} onPrint={lineItemPrint} />
          </div>
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="bg-muted/40 text-[10.5px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 w-10">S/N</th>
                  <th className="text-left px-3 py-2">Code</th>
                  <th className="text-left px-3 py-2">Expenditure Item</th>
                  <th className="text-right px-3 py-2">Total Amount (₦)</th>
                </tr>
              </thead>
              <tbody>
                {lineItemRows.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center italic text-muted-foreground">No data for current filters.</td></tr>}
                {lineItemRows.map((r, _i) => (
                  <tr key={r.code} className="border-t border-border">
                    <td className="px-3 py-1.5 text-xs text-muted-foreground tabular-nums">{_i + 1}</td>
                    <td className="px-3 py-1.5"><BudgetCode code={r.code} /></td>
                    <td className="px-3 py-1.5">{r.name}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{fmtN(r.total)}</td>
                  </tr>
                ))}
                {lineItemRows.length > 0 && (
                  <tr className="border-t border-border bg-muted/30 font-semibold">
                    <td />
                    <td className="px-3 py-1.5">TOTAL</td>
                    <td />
                    <td className="px-3 py-1.5 text-right font-mono">{fmtN(lineItemTotal)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="formation" className="space-y-3 mt-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[12px] text-muted-foreground">Distribution Summary — Commands &amp; Formations allocation (latest period).</p>
            <div className="flex items-center gap-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">State</Label>
              <Select value={formationStateFilter} onValueChange={setFormationStateFilter}>
                <SelectTrigger className="h-8 w-[180px] text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="ALL">All states</SelectItem>
                  {allStatesForForms.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <ExportBar onCsv={formationCsv} onPdf={formationPdf} onPrint={formationPrint} />
            </div>
          </div>
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="bg-muted/40 text-[10.5px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 w-16">S/No.</th>
                  <th className="text-left px-3 py-2">Commands/Formations</th>
                  <th className="text-right px-3 py-2">Allocation (₦)</th>
                </tr>
              </thead>
              <tbody>
                {summaryFiltered.length === 0 && <tr><td colSpan={3} className="px-3 py-6 text-center italic text-muted-foreground">No rows for current filters.</td></tr>}
                {summaryFiltered.map((r, i) => (
                  <tr key={`${r.name}-${i}`} className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-1.5 font-mono">{i + 1}</td>
                    <td className="px-3 py-1.5">{r.name}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{fmtN(Number(r.allocation || 0))}</td>
                  </tr>
                ))}
                {summaryFiltered.length > 0 && (
                  <tr className="border-t border-border bg-muted/30 font-semibold">
                    <td className="px-3 py-1.5" colSpan={2}>GRAND TOTAL</td>
                    <td className="px-3 py-1.5 text-right font-mono">{fmtN(summaryTotal)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="ledger" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-muted-foreground">Read-only mirror of AIE Records. All shown as Approved.</p>
            <ExportBar onCsv={ledgerCsv} onPdf={ledgerPdf} onPrint={ledgerPrint} />
          </div>
          <AieBalancesSummary
            aieRows={filteredAies.map(r => ({
              id: r.id, fiscal_year: r.fiscal_year, issue_date: r.issue_date,
              sub_item_code: r.sub_item_code, amount: Number(r.amount || 0),
            }))}
            subByCode={subByCode}
            availableYears={Array.from(new Set(aies.map(a => a.fiscal_year))).sort()}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({ label, value, hint, emphasize }: { label: string; value: string; hint?: string; emphasize?: boolean }) {
  return (
    <Card className={emphasize ? "border-primary/50" : ""}>
      <CardContent className="p-4 space-y-1">
        <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`font-mono text-lg ${emphasize ? "text-primary font-bold" : "font-semibold"}`}>{value}</div>
        {hint && <div className="text-[10.5px] text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function FormationRow({
  sno, row, expanded, onToggle, subByCode,
}: {
  sno: number;
  row: { name: string; state: string; total: number; byCode: Record<string, number> };
  expanded: boolean;
  onToggle: () => void;
  subByCode: Record<string, SubItem>;
}) {
  const codes = Object.entries(row.byCode).sort((a, b) => a[0].localeCompare(b[0]));
  return (
    <>
      <tr className="border-t border-border hover:bg-muted/20">
        <td className="px-3 py-1.5 font-mono">{sno}</td>
        <td className="px-3 py-1.5">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-2">{row.state}</span>
          {row.name}
        </td>
        <td className="px-3 py-1.5 text-right">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1 font-mono text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
            aria-expanded={expanded}
          >
            {fmtN(row.total)}
            {expanded ? <ChevronRight className="h-3.5 w-3.5 rotate-90" /> : <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-t border-border bg-muted/10">
          <td />
          <td colSpan={2} className="px-3 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11.5px] font-semibold">Breakdown — {row.name}</div>
              <Button size="sm" variant="ghost" onClick={onToggle}>Close</Button>
            </div>
            <div className="rounded border border-border overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-2 py-1.5">Code</th>
                    <th className="text-left px-2 py-1.5">Expenditure Item</th>
                    <th className="text-right px-2 py-1.5">Amount (₦)</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map(([code, amt]) => (
                    <tr key={code} className="border-t border-border">
                      <td className="px-2 py-1"><BudgetCode code={code} /></td>
                      <td className="px-2 py-1">{subByCode[code]?.name ?? resolveBudgetCode(code).name ?? "—"}</td>
                      <td className="px-2 py-1 text-right font-mono">{fmtN(amt)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-border bg-muted/30 font-semibold">
                    <td colSpan={2} className="px-2 py-1">SUB-TOTAL</td>
                    <td className="px-2 py-1 text-right font-mono">{fmtN(row.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}