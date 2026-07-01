import { Download } from "lucide-react";
import { UPLOAD_INSTRUCTIONS, downloadCsvTemplate, downloadXlsxTemplate } from "@/lib/tableUpload";

export function UploadInstructionsBlock({
  headers, templateBaseName,
}: { headers: string[]; templateBaseName: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-2.5 text-[11.5px] leading-relaxed text-muted-foreground space-y-2">
      <p>{UPLOAD_INSTRUCTIONS}</p>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[11px] font-semibold text-foreground">Download Template:</span>
        <button
          type="button"
          onClick={() => downloadCsvTemplate(headers, templateBaseName)}
          className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[11px] hover:bg-accent hover:text-accent-foreground"
        >
          <Download className="h-3 w-3" /> CSV
        </button>
        <button
          type="button"
          onClick={() => downloadXlsxTemplate(headers, templateBaseName)}
          className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[11px] hover:bg-accent hover:text-accent-foreground"
        >
          <Download className="h-3 w-3" /> XLSX
        </button>
      </div>
    </div>
  );
}