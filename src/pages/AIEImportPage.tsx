import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { FileUp, Loader2, UploadCloud, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  uploadAieWorkbook, replaceAieWorkbook,
  type AieImportSummary, type ImportConflict,
} from "@/lib/aieImportsApi";

const ACCEPTED = ".xlsx,.xls,.csv";
const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

type UploadAction = "append" | "correction" | "replace";

export default function AIEImportPage() {
  useEffect(() => { document.title = "AIE Workbook Import – NPF BMS"; }, []);
  const { hasRole } = useAuth();
  const canUpload = hasRole("BUDGET_DIR") || hasRole("SYSADMIN") || hasRole("BUDGET_OFF");

  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fiscalYear, setFiscalYear] = useState<string>(String(currentYear));
  const [action, setAction] = useState<UploadAction>("append");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<AieImportSummary | null>(null);
  const [conflict, setConflict] = useState<ImportConflict | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
    setConflict(null);
    setConfirmReplace(false);
  };

  const handleUpload = async () => {
    if (!file) { toast.error("Please select a file."); return; }
    const fy = Number(fiscalYear);
    if (!fy || fy < 2000 || fy > 2100) { toast.error("Invalid fiscal year."); return; }

    setUploading(true);
    setResult(null);
    setConflict(null);

    try {
      if (action === "replace") {
        const res = await replaceAieWorkbook(file, fy, confirmReplace);
        if ("conflict" in res && res.conflict) {
          setConflict(res as ImportConflict);
          toast.warning("Overlap detected — review the conflict below and confirm to replace.");
        } else {
          setResult(res as AieImportSummary);
          setFile(null);
          setConfirmReplace(false);
          if (fileRef.current) fileRef.current.value = "";
          toast.success("Workbook uploaded for replacement reconciliation.");
        }
      } else {
        const res = await uploadAieWorkbook(file, fy, action);
        setResult(res);
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
        toast.success("Workbook uploaded successfully.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed.";
      const status = (e as { status?: number }).status;
      if (status === 409) {
        toast.error("Conflict: this workbook overlaps with existing data. Try the Replace action.");
      } else {
        toast.error(msg);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmReplace = async () => {
    if (!file) return;
    setConfirmReplace(true);
    setConflict(null);
    await handleUpload();
  };

  if (!canUpload) {
    return (
      <div className="max-w-xl">
        <h1 className="text-xl font-bold font-serif mb-3">AIE Workbook Import</h1>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>You do not have permission to upload AIE workbooks.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold font-serif flex items-center gap-2">
          <FileUp className="h-5 w-5" /> AIE Workbook Import
        </h1>
        <p className="text-[12px] text-muted-foreground mt-1">
          Upload an AIE budget or actuals workbook (Excel / CSV). The system will parse and queue
          it for reconciliation. Directors review and approve before data is committed.
        </p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          {/* Fiscal year */}
          <div className="flex flex-wrap gap-4">
            <div>
              <Label className="text-[11px]">Fiscal year</Label>
              <Select value={fiscalYear} onValueChange={setFiscalYear}>
                <SelectTrigger className="h-8 w-28 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px]">Upload action</Label>
              <Select value={action} onValueChange={(v) => {
                setAction(v as UploadAction);
                setConflict(null);
                setConfirmReplace(false);
              }}>
                <SelectTrigger className="h-8 w-48 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="append">Append — add new records</SelectItem>
                  <SelectItem value="correction">Correction — update existing</SelectItem>
                  <SelectItem value="replace">Replace — overwrite period</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* File input */}
          <div>
            <Label className="text-[11px]">Workbook file</Label>
            <div className="mt-1 flex items-center gap-3">
              <label className="flex-1 flex items-center gap-2 border border-dashed border-border rounded-lg px-4 py-5 cursor-pointer hover:bg-muted/30 transition-colors">
                <UploadCloud className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  {file ? (
                    <p className="text-[12px] font-medium truncate">{file.name}</p>
                  ) : (
                    <p className="text-[12px] text-muted-foreground">Click to select .xlsx / .xls / .csv</p>
                  )}
                  {file && (
                    <p className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept={ACCEPTED}
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </label>
              <Button
                type="button"
                size="sm"
                disabled={!file || uploading}
                onClick={handleUpload}
              >
                {uploading
                  ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Uploading…</>
                  : <><FileUp className="h-3.5 w-3.5 mr-1" />Upload</>}
              </Button>
            </div>
          </div>

          {/* Conflict UI */}
          {conflict && (
            <Alert className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="space-y-2">
                <p className="text-[12px] font-medium text-orange-800 dark:text-orange-300">
                  Overlap detected — {conflict.overlaps.length} row{conflict.overlaps.length !== 1 ? "s" : ""} conflict with existing data.
                </p>
                <div className="rounded border border-orange-200 dark:border-orange-800 overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead className="bg-orange-100 dark:bg-orange-900/30">
                      <tr>
                        <th className="text-left px-2 py-1">Month</th>
                        <th className="text-left px-2 py-1">Budget code</th>
                        <th className="text-right px-2 py-1">Existing</th>
                        <th className="text-right px-2 py-1">Incoming</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conflict.overlaps.slice(0, 10).map((o, i) => (
                        <tr key={i} className="border-t border-orange-100 dark:border-orange-900/30">
                          <td className="px-2 py-1">{o.month}</td>
                          <td className="px-2 py-1 font-mono">{o.budgetCode}</td>
                          <td className="px-2 py-1 text-right tabular-nums">
                            {o.existingAmount.toLocaleString("en-NG")}
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums font-medium">
                            {o.incomingAmount.toLocaleString("en-NG")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {conflict.overlaps.length > 10 && (
                  <p className="text-[11px] text-muted-foreground">
                    …and {conflict.overlaps.length - 10} more.
                  </p>
                )}
                <p className="text-[12px] text-orange-700 dark:text-orange-400">
                  Confirming will replace all conflicting rows. This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    type="button"
                    disabled={uploading}
                    onClick={handleConfirmReplace}
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm replace"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => { setConflict(null); setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                  >
                    Cancel
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Success result */}
          {result && (
            <Alert className="border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="space-y-1">
                <p className="text-[12px] font-medium text-emerald-800 dark:text-emerald-300">
                  Upload complete — queued for director reconciliation.
                </p>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <Badge variant="outline" className="text-[10px]">{result.fileName}</Badge>
                  <Badge variant="outline" className="text-[10px]">FY {result.fiscalYear}</Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {result.rowCounts?.budgets ?? 0} budget rows · {result.rowCounts?.actuals ?? 0} actual rows
                  </Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">{result.status}</Badge>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Info box */}
      <Card className="bg-muted/30">
        <CardContent className="p-4 space-y-2 text-[11.5px] text-muted-foreground">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground">How it works</p>
            <button
              type="button"
              className="text-[11px] text-primary underline underline-offset-2 hover:opacity-80"
              onClick={() => {
                const rows = [
                  ["Month", "Code", "BudgetAmount", "ActualAmount"],
                  ["January", "102", "500000", "480000"],
                  ["January", "201", "250000", "230000"],
                  ["January", "0301(a)", "100000", "95000"],
                  ["January", "0301(g)", "360000", "350000"],
                  ["February", "102", "500000", "460000"],
                  ["February", "201", "250000", "240000"],
                  ["February", "0301(a)", "100000", "90000"],
                ];
                const csv = rows.map(r => r.join(",")).join("\n");
                const a = document.createElement("a");
                a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                a.download = "aie-workbook-sample.csv";
                a.click();
              }}
            >
              Download sample CSV
            </button>
          </div>
          <p className="text-[11px]">Columns: <span className="font-mono">Month, Code, BudgetAmount, ActualAmount</span></p>
          <ol className="list-decimal list-inside space-y-1">
            <li><b>Append</b> adds new period records without touching existing ones.</li>
            <li><b>Correction</b> updates existing records for the same period.</li>
            <li><b>Replace</b> replaces all records for the period — warns on conflict.</li>
            <li>
              After upload the workbook appears in the <b>Workbook Reconciliations</b> tab
              on the Budget Proposals page for a director to review and approve.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
