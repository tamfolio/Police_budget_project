import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileDown, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export type ParsedRow<T> =
  | { ok: true; value: T; raw: Record<string, string>; rowNumber: number }
  | { ok: false; errors: string[]; raw: Record<string, string>; rowNumber: number };

interface Props<T> {
  entity: string;                                  // e.g. "Fund Inflows"
  templateHeaders: string[];                       // CSV/Excel headers users should fill
  sampleRow?: Record<string, string | number>;     // one example row in the template
  parseRow: (row: Record<string, string>, idx: number) => ParsedRow<T>;
  onImport: (rows: T[]) => Promise<{ inserted: number; failed?: number }>;
  triggerLabel?: string;
  triggerClassName?: string;
  buttonSize?: "sm" | "default";
}

export function CsvImportDialog<T>({
  entity, templateHeaders, sampleRow, parseRow, onImport,
  triggerLabel = "Import CSV/XLSX", triggerClassName, buttonSize = "sm",
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow<T>[]>([]);
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => { setRows([]); if (inputRef.current) inputRef.current.value = ""; };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(
      sampleRow ? [sampleRow] : [Object.fromEntries(templateHeaders.map(h => [h, ""]))],
      { header: templateHeaders }
    );
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${entity.toLowerCase().replace(/\s+/g, "-")}-template.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const onFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "", raw: false });
      if (!json.length) { toast.error("File contains no rows."); return; }
      const parsed = json.map((r, i) => parseRow(r, i + 2)); // +2 accounts for header row
      setRows(parsed);
    } catch (e: any) {
      toast.error(e?.message || "Failed to read file");
    }
  };

  const valid = rows.filter(r => r.ok) as Extract<ParsedRow<T>, { ok: true }>[];
  const invalid = rows.filter(r => !r.ok) as Extract<ParsedRow<T>, { ok: false }>[];

  const runImport = async () => {
    if (!valid.length) { toast.error("No valid rows to import."); return; }
    setImporting(true);
    try {
      const res = await onImport(valid.map(r => r.value));
      toast.success(`${res.inserted} ${entity.toLowerCase()} imported${res.failed ? ` (${res.failed} failed)` : ""}.`);
      reset(); setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Import failed");
    } finally { setImporting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <Button
        size={buttonSize}
        variant="outline"
        className={triggerClassName || "h-8 text-[11px]"}
        onClick={() => setOpen(true)}
        type="button"
      >
        <Upload className="h-3 w-3 mr-1" />{triggerLabel}
      </Button>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">Bulk import {entity}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-[12px]">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" className="h-8 text-[11px]" onClick={downloadTemplate}>
              <FileDown className="h-3 w-3 mr-1" />Download template
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="text-[11px]"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />
            {rows.length > 0 && (
              <Button type="button" size="sm" variant="ghost" className="h-8 text-[11px]" onClick={reset}>
                Clear
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Required columns: <span className="font-mono">{templateHeaders.join(", ")}</span>. Records are created as Draft and can be edited before submission.
          </p>

          {rows.length > 0 && (
            <>
              <div className="flex gap-4 text-[12px]">
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />{valid.length} valid
                </span>
                <span className="inline-flex items-center gap-1 text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />{invalid.length} invalid
                </span>
              </div>
              <div className="max-h-[320px] overflow-auto rounded-md border border-border">
                <table className="w-full text-[11px]">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Row</th>
                      <th className="px-2 py-1.5 text-left">Status</th>
                      <th className="px-2 py-1.5 text-left">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.rowNumber} className="border-t border-border">
                        <td className="px-2 py-1.5 font-mono">{r.rowNumber}</td>
                        <td className="px-2 py-1.5">
                          {r.ok
                            ? <span className="text-emerald-600">OK</span>
                            : <span className="text-destructive">Error</span>}
                        </td>
                        <td className="px-2 py-1.5">
                          {r.ok ? (
                            <span className="text-muted-foreground">{Object.values(r.raw).slice(0, 4).join(" • ")}</span>
                          ) : (
                            <span className="text-destructive">{(r as Extract<ParsedRow<T>, { ok: false }>).errors.join("; ")}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="button" onClick={runImport} disabled={!valid.length || importing}>
            {importing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
            Import {valid.length} row{valid.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}