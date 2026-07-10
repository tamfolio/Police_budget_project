import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FileSignature, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/apiClient";
import { getAiesReport, type AieReportRow } from "@/lib/aiesApi";

const MONTH_ORDER = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

function sortMonthKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const ai = MONTH_ORDER.indexOf(a.slice(0, 3).toLowerCase());
    const bi = MONTH_ORDER.indexOf(b.slice(0, 3).toLowerCase());
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

const fmtNGN = (n: number | undefined) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const fmtPct = (n: number | undefined) =>
  `${((Number(n) || 0) * 100).toFixed(2)}%`;

const FISCAL_YEARS = [2023, 2024, 2025, 2026, 2027];

const MONTHS = [
  { value: "1",  label: "January"   },
  { value: "2",  label: "February"  },
  { value: "3",  label: "March"     },
  { value: "4",  label: "April"     },
  { value: "5",  label: "May"       },
  { value: "6",  label: "June"      },
  { value: "7",  label: "July"      },
  { value: "8",  label: "August"    },
  { value: "9",  label: "September" },
  { value: "10", label: "October"   },
  { value: "11", label: "November"  },
  { value: "12", label: "December"  },
];

export default function AIERecordsPage() {
  const currentYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(currentYear);
  const [month, setMonth] = useState<string>("all");
  const [rows, setRows] = useState<AieReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "AIE Records – NPF BMS"; }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params: { fiscalYear: number; month?: number } = { fiscalYear };
      if (month !== "all") params.month = Number(month);
      const res = await getAiesReport(params);
      setRows(res?.rows ?? []);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load AIE report.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchReport(); }, [fiscalYear, month]);

  const monthKeys = useMemo(() => {
    if (!rows.length) return [];
    return sortMonthKeys(Object.keys(rows[0].months ?? {}));
  }, [rows]);

  const totals = useMemo(() =>
    rows.reduce(
      (acc, r) => ({
        annualAppropriation: acc.annualAppropriation + (r.annualAppropriation ?? 0),
        totalBudget:         acc.totalBudget         + (r.totalBudget         ?? 0),
        totalActual:         acc.totalActual         + (r.totalActual         ?? 0),
        balance:             acc.balance             + (r.balance             ?? 0),
      }),
      { annualAppropriation: 0, totalBudget: 0, totalActual: 0, balance: 0 },
    ),
  [rows]);

  const monthTotals = useMemo(() =>
    Object.fromEntries(
      monthKeys.map(mk => [
        mk,
        rows.reduce(
          (acc, r) => ({
            budget: acc.budget + (r.months?.[mk]?.budget ?? 0),
            actual: acc.actual + (r.months?.[mk]?.actual ?? 0),
          }),
          { budget: 0, actual: 0 },
        ),
      ]),
    ),
  [rows, monthKeys]);

  const totalCols = 7 + monthKeys.length * 2;
  const selectedMonthLabel = MONTHS.find(m => m.value === month)?.label;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold font-serif flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            AIE Records
          </h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Authority to Incur Expenditure — budget vs. actual by sub-item code.
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={String(fiscalYear)} onValueChange={v => setFiscalYear(Number(v))}>
            <SelectTrigger className="h-9 w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FISCAL_YEARS.map(y => (
                <SelectItem key={y} value={String(y)}>FY {y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="All months" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {MONTHS.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchReport} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Report table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse whitespace-nowrap">
            <thead>
              {/* Row 1: column names + month group headers */}
              <tr className="bg-muted/40">
                <th
                  rowSpan={2}
                  className="sticky left-0 z-20 bg-muted/40 text-left px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wide border-b border-r border-border min-w-[110px]"
                >
                  Code
                </th>
                <th
                  rowSpan={2}
                  className="text-left px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wide border-b border-r border-border min-w-[260px]"
                >
                  Expenditure Item
                </th>
                <th rowSpan={2} className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wide border-b border-border">
                  Annual Appropriation
                </th>
                <th rowSpan={2} className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wide border-b border-border">
                  % Allocated
                </th>
                <th rowSpan={2} className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wide border-b border-border">
                  Total Budget
                </th>
                <th rowSpan={2} className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wide border-b border-border">
                  Total Actual
                </th>
                <th rowSpan={2} className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wide border-b border-r border-border">
                  Balance
                </th>
                {monthKeys.map(mk => (
                  <th
                    key={mk}
                    colSpan={2}
                    className="text-center px-3 py-2 font-semibold text-[11px] uppercase tracking-wide border-b border-l border-border"
                  >
                    {mk}
                  </th>
                ))}
              </tr>
              {/* Row 2: Budget / Actual sub-headers for each month */}
              <tr className="bg-muted/20">
                {monthKeys.map(mk => (
                  <Fragment key={mk}>
                    <th className="text-right px-3 py-1.5 text-[10px] font-medium text-muted-foreground border-b border-l border-border">
                      Budget
                    </th>
                    <th className="text-right px-3 py-1.5 text-[10px] font-medium text-muted-foreground border-b border-border">
                      Actual
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={totalCols} className="px-4 py-14 text-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Loading AIE report…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={totalCols} className="px-4 py-14 text-center text-muted-foreground">
                    No data found for FY {fiscalYear}
                    {month !== "all" ? `, ${selectedMonthLabel}` : ""}.
                  </td>
                </tr>
              ) : (
                <>
                  {rows.map((r, i) => (
                    <tr key={r.code ?? i} className="hover:bg-muted/10 transition-colors">
                      {/* Sticky code column */}
                      <td className="sticky left-0 z-10 bg-card px-3 py-2.5 font-mono border-r border-border">
                        {r.code}
                      </td>
                      {/* Expenditure item — allow wrapping for long names */}
                      <td className="px-3 py-2.5 border-r border-border max-w-[300px]">
                        <div className="truncate" title={r.expenditureItem}>
                          {r.expenditureItem}
                        </div>
                      </td>
                      <td className="text-right px-3 py-2.5 tabular-nums">{fmtNGN(r.annualAppropriation)}</td>
                      <td className="text-right px-3 py-2.5 tabular-nums">{fmtPct(r.percentAllocated)}</td>
                      <td className="text-right px-3 py-2.5 tabular-nums">{fmtNGN(r.totalBudget)}</td>
                      <td className="text-right px-3 py-2.5 tabular-nums">{fmtNGN(r.totalActual)}</td>
                      <td
                        className={`text-right px-3 py-2.5 tabular-nums border-r border-border font-medium ${
                          r.balance < 0 ? "text-destructive" : ""
                        }`}
                      >
                        {fmtNGN(r.balance)}
                      </td>
                      {monthKeys.map(mk => {
                        const m = r.months?.[mk];
                        return (
                          <Fragment key={mk}>
                            <td className="text-right px-3 py-2.5 tabular-nums border-l border-border">
                              {fmtNGN(m?.budget)}
                            </td>
                            <td className="text-right px-3 py-2.5 tabular-nums">
                              {fmtNGN(m?.actual)}
                            </td>
                          </Fragment>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Totals row */}
                  <tr className="bg-muted/30 font-semibold border-t-2 border-border">
                    <td className="sticky left-0 z-10 bg-muted/30 px-3 py-2.5 text-[11px] uppercase tracking-wide border-r border-border">
                      Total
                    </td>
                    <td className="px-3 py-2.5 border-r border-border" />
                    <td className="text-right px-3 py-2.5 tabular-nums">{fmtNGN(totals.annualAppropriation)}</td>
                    <td className="px-3 py-2.5" />
                    <td className="text-right px-3 py-2.5 tabular-nums">{fmtNGN(totals.totalBudget)}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums">{fmtNGN(totals.totalActual)}</td>
                    <td
                      className={`text-right px-3 py-2.5 tabular-nums border-r border-border ${
                        totals.balance < 0 ? "text-destructive" : ""
                      }`}
                    >
                      {fmtNGN(totals.balance)}
                    </td>
                    {monthKeys.map(mk => (
                      <Fragment key={mk}>
                        <td className="text-right px-3 py-2.5 tabular-nums border-l border-border">
                          {fmtNGN(monthTotals[mk]?.budget)}
                        </td>
                        <td className="text-right px-3 py-2.5 tabular-nums">
                          {fmtNGN(monthTotals[mk]?.actual)}
                        </td>
                      </Fragment>
                    ))}
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
