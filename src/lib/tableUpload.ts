// Shared helpers for the "Upload CSV or XLSX" + "Download Template" flow
// used by the Add Month (AIE Records) and Add Period (Distributions) modals.
import * as XLSX from "xlsx";

export const UPLOAD_INSTRUCTIONS =
  "Your uploaded file must be a replica of the table as it appears on screen. " +
  "The column headers in your file must exactly match the column headers in the table, in the same order. " +
  "Each row should represent one record. Monetary values should be plain numbers with no currency symbols or thousand separators. " +
  "For XLSX files, use the first sheet only. Download a template below to get started.";

export const UPLOAD_ACCEPT = ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Returns rows as arrays of strings. First row treated as the header by callers.
export async function parseUpload(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, blankrows: false, raw: false });
    return rows.map(r => (r as any[]).map(v => v == null ? "" : String(v)));
  }
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(l => l.length > 0);
  return lines.map(parseCsvLine);
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
  return out.map(s => s.trim());
}

export function downloadCsvTemplate(headers: string[], filename: string) {
  const csv = headers.map(h => /[",\n]/.test(h) ? `"${h.replace(/"/g, '""')}"` : h).join(",") + "\n";
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

export function downloadXlsxTemplate(headers: string[], filename: string) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  triggerDownload(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}