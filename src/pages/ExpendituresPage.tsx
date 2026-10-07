import { useEffect, useRef, useState } from "react";
import ExpendituresOverviewTab from "@/components/expenditures/ExpendituresOverviewTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Upload, Download, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { createExpenditure, type CreateExpenditurePayload } from "@/lib/expendituresApi";
import { useAuth } from "@/contexts/AuthContext";

// ── CSV column spec ───────────────────────────────────────────────────────────
const CSV_COLUMNS = [
  "fiscal_year",
  "expense_date",
  "voucher_no",
  "payee",
  "sub_item_code",
  "aie_id",
  "gross_amount",
  "wht_amount",
  "description",
] as const;

const TEMPLATE_ROWS = [
  "2026,2026-01-15,VCH-001,John Doe Trading Co.,0301(a),,150000,0,Stationery supplies",
  "2026,2026-02-03,VCH-002,ABC Electrical Ltd,0201,,80000,0,Electricity charges",
];

const TEMPLATE_CSV =
  `# NPF BMS – Expenditure Upload Template\n` +
  `# HOW TO USE THIS TEMPLATE\n` +
  `# 1. Fill in your data below the column header row (do not change the headers)\n` +
  `# 2. Delete these instruction lines (lines starting with #) before uploading\n` +
  `# 3. Save as CSV and upload using the Upload button on the Expenditures page\n` +
  `#\n` +
  `# COLUMN GUIDE\n` +
  `# fiscal_year  — The financial year, e.g. 2026\n` +
  `# expense_date — Date of the expense: YYYY-MM-DD format, e.g. 2026-03-15\n` +
  `# voucher_no   — Your payment or voucher reference number\n` +
  `# payee        — Name of the person or company that was paid\n` +
  `# sub_item_code — The budget code for this expense, e.g. 0301(a)\n` +
  `# aie_id       — Leave blank unless the expense is linked to an AIE record\n` +
  `# gross_amount  — Total amount paid in Naira — numbers only, no commas (e.g. 150000)\n` +
  `# wht_amount   — Withholding tax deducted, if any (enter 0 if none)\n` +
  `# description  — Optional notes about the expense\n` +
  `${CSV_COLUMNS.join(",")}\n` +
  TEMPLATE_ROWS.join("\n") + "\n";

// ── Row parse & validate ──────────────────────────────────────────────────────
type ParsedRow = {
  raw: string[];
  index: number;
  errors: string[];
  payload?: CreateExpenditurePayload;
};

function parseCSV(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#"));

  if (lines.length === 0) return [];

  // Strip header row if it matches the column names
  const first = lines[0].toLowerCase().replace(/\s/g, "");
  const headerSig = CSV_COLUMNS.join(",").replace(/\s/g, "");
  const dataLines = first === headerSig ? lines.slice(1) : lines;

  return dataLines.map((line, i) => {
    const raw = line.split(",").map(c => c.trim());
    const errors: string[] = [];

    const [
      fiscal_year_s, expense_date, voucher_no, payee, sub_item_code,
      aie_id, gross_amount_s, wht_amount_s, ...descParts
    ] = raw;

    const fiscal_year = parseInt(fiscal_year_s, 10);
    const gross_amount = parseFloat((gross_amount_s ?? "").replace(/[^0-9.]/g, ""));
    const wht_amount = parseFloat((wht_amount_s ?? "0").replace(/[^0-9.]/g, "")) || 0;
    const description = descParts.join(",").trim() || undefined;

    if (!fiscal_year_s || isNaN(fiscal_year) || fiscal_year < 2000 || fiscal_year > 2100)
      errors.push("fiscal_year must be a valid 4-digit year");
    if (!expense_date || !/^\d{4}-\d{2}-\d{2}$/.test(expense_date))
      errors.push("expense_date must be YYYY-MM-DD");
    if (!voucher_no) errors.push("voucher_no is required");
    if (!payee) errors.push("payee is required");
    if (!sub_item_code) errors.push("sub_item_code is required");
    if (!gross_amount_s || isNaN(gross_amount) || gross_amount < 0)
      errors.push("gross_amount must be a non-negative number");

    const payload: CreateExpenditurePayload | undefined = errors.length === 0 ? {
      fiscalYear: fiscal_year,
      expenseDate: expense_date,
      voucherNo: voucher_no,
      payee,
      subItemCode: sub_item_code,
      aieId: aie_id || null,
      grossAmount: gross_amount,
      whtAmount: wht_amount,
      description,
    } : undefined;

    return { raw, index: i + 1, errors, payload };
  });
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ExpendituresPage() {
  const { hasRole } = useAuth();
  const canUpload = hasRole("BUDGET_CLK") || hasRole("SYSADMIN");
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => { document.title = "Expenditures – NPF BMS"; }, []);

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenditure-upload-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Expenditures</h1>
          <p className="text-[12px] text-muted-foreground">
            Budget actuals — consolidated view across AIE records and distribution periods.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-1" /> CSV Template
          </Button>
          {canUpload && (
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-1" /> Upload CSV
            </Button>
          )}
        </div>
      </div>

      <ExpendituresOverviewTab />

      {uploadOpen && (
        <CsvUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
      )}
    </div>
  );
}

// ── CSV Upload dialog ─────────────────────────────────────────────────────────
function CsvUploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<{ index: number; ok: boolean; msg: string }[]>([]);
  const [done, setDone] = useState(false);

  const validRows = rows.filter(r => r.errors.length === 0);
  const invalidRows = rows.filter(r => r.errors.length > 0);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResults([]);
    setDone(false);
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setRows(parseCSV(text));
    };
    reader.readAsText(file);
  };

  const submit = async () => {
    if (validRows.length === 0) return;
    setSubmitting(true);
    const res: typeof results = [];
    for (const row of validRows) {
      try {
        await createExpenditure(row.payload!);
        res.push({ index: row.index, ok: true, msg: `Row ${row.index} created.` });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        res.push({ index: row.index, ok: false, msg: `Row ${row.index}: ${msg}` });
      }
    }
    setResults(res);
    setSubmitting(false);
    setDone(true);
    const succeeded = res.filter(r => r.ok).length;
    if (succeeded === validRows.length) {
      toast.success(`${succeeded} expenditure${succeeded === 1 ? "" : "s"} uploaded successfully.`);
    } else {
      toast.warning(`${succeeded} of ${validRows.length} rows uploaded. Check results below.`);
    }
  };

  const reset = () => {
    setRows([]);
    setFileName("");
    setResults([]);
    setDone(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Expenditures</DialogTitle>
          <DialogDescription>
            Upload a spreadsheet of expenditure records. Download the CSV Template first to see the required column layout. Each valid row is saved as a draft record. Rows with errors are shown below and skipped — your file is never partially applied.
          </DialogDescription>
        </DialogHeader>

        {!done && (
          <div className="space-y-3 shrink-0">
            <div>
              <Label className="text-[11px]">CSV file</Label>
              <Input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                className="mt-1 h-9 text-[12px]"
              />
            </div>
            {rows.length > 0 && (
              <div className="flex items-center gap-3 text-[12px]">
                <span className="text-muted-foreground">{fileName}</span>
                <Badge variant="secondary">{rows.length} row{rows.length === 1 ? "" : "s"} detected</Badge>
                {validRows.length > 0 && <Badge variant="default">{validRows.length} valid</Badge>}
                {invalidRows.length > 0 && <Badge variant="destructive">{invalidRows.length} invalid</Badge>}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto mt-2 space-y-3">
          {/* Validation errors */}
          {!done && invalidRows.length > 0 && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-1.5">
              <p className="text-[11px] font-semibold text-destructive">Rows with errors (will be skipped):</p>
              {invalidRows.map(r => (
                <div key={r.index} className="text-[11px]">
                  <span className="font-mono font-semibold">Row {r.index}:</span>{" "}
                  {r.errors.join("; ")}
                </div>
              ))}
            </div>
          )}

          {/* Preview table of valid rows */}
          {!done && validRows.length > 0 && (
            <div className="overflow-x-auto rounded border border-border">
              <table className="w-full text-[11.5px]">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-2 py-1.5 text-left w-8">#</th>
                    <th className="px-2 py-1.5 text-left w-16">FY</th>
                    <th className="px-2 py-1.5 text-left w-28">Date</th>
                    <th className="px-2 py-1.5 text-left w-28">Voucher</th>
                    <th className="px-2 py-1.5 text-left">Payee</th>
                    <th className="px-2 py-1.5 text-left w-24">Sub-Item</th>
                    <th className="px-2 py-1.5 text-right w-28">Gross (₦)</th>
                    <th className="px-2 py-1.5 text-right w-24">WHT (₦)</th>
                  </tr>
                </thead>
                <tbody>
                  {validRows.map(r => (
                    <tr key={r.index} className="border-t border-border">
                      <td className="px-2 py-1 text-muted-foreground">{r.index}</td>
                      <td className="px-2 py-1">{r.payload!.fiscalYear}</td>
                      <td className="px-2 py-1">{r.payload!.expenseDate}</td>
                      <td className="px-2 py-1 font-mono">{r.payload!.voucherNo}</td>
                      <td className="px-2 py-1 max-w-[160px] truncate">{r.payload!.payee}</td>
                      <td className="px-2 py-1 font-mono">{r.payload!.subItemCode}</td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2 }).format(r.payload!.grossAmount)}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2 }).format(r.payload!.whtAmount ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Upload results */}
          {done && results.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground">Upload results:</p>
              {results.map(r => (
                <div key={r.index} className={`flex items-start gap-2 text-[11.5px] ${r.ok ? "text-foreground" : "text-destructive"}`}>
                  {r.ok
                    ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600" />
                    : <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                  {r.msg}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0">
          {done ? (
            <>
              <Button variant="ghost" onClick={reset}>Upload another file</Button>
              <Button onClick={onClose}>Close</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
              {rows.length > 0 && !done && (
                <Button onClick={reset} variant="outline" disabled={submitting}>Clear</Button>
              )}
              <Button
                onClick={submit}
                disabled={validRows.length === 0 || submitting}
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Uploading…</>
                  : <><Upload className="h-4 w-4 mr-1" /> Upload {validRows.length > 0 ? `${validRows.length} row${validRows.length === 1 ? "" : "s"}` : ""}</>
                }
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
