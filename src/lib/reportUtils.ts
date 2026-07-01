import jsPDF from "jspdf";

// ---- Money helpers (cents-safe) ----
export const toCents = (n: number) => Math.round((Number(n) || 0) * 100);
export const fromCents = (c: number) => c / 100;
export const sumCents = (arr: number[]) => arr.reduce((a, n) => a + toCents(n), 0);

// On-screen currency (with ₦)
export const fmtN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
// Plain integer with comma separators (counts, quantities)
export const fmtInt = (n: number) =>
  new Intl.NumberFormat("en-NG").format(Math.round(Number(n) || 0));
// PDF currency (Helvetica has no ₦ glyph)
export const fmtPdfNgn = (n: number) =>
  "NGN " + new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
export const fmtPdfNum = (n: number) =>
  new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
export const fmtNum = (n: number) =>
  new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

// ---- CSV ----
const escapeCsv = (v: unknown): string => {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};
export const buildCsv = (headers: string[], rows: (string | number | null | undefined)[][]) => {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const r of rows) lines.push(r.map(escapeCsv).join(","));
  return lines.join("\r\n");
};
export const downloadBlob = (content: string | Blob, filename: string, mime = "text/csv;charset=utf-8") => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ---- Print ----
// Opens a clean popup with print stylesheet and the supplied HTML, then prints.
export const printHtml = (title: string, bodyHtml: string) => {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) { alert("Pop-up blocked. Allow pop-ups to print."); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>
      body{font-family: 'Helvetica Neue', Arial, sans-serif; color:#0A1628; padding:24px;}
      h1{font-size:18px; margin:0 0 4px 0;}
      h2{font-size:14px; margin:18px 0 6px 0;}
      .meta{color:#666; font-size:11px; margin-bottom:12px;}
      table{width:100%; border-collapse:collapse; font-size:11px; margin-top:6px;}
      th, td{border:1px solid #ddd; padding:4px 6px; text-align:left;}
      th{background:#f5f5f5; text-transform:uppercase; font-size:10px; letter-spacing:.04em;}
      td.num, th.num{text-align:right; font-variant-numeric: tabular-nums;}
      tr.total td{font-weight:600; background:#fafafa;}
      @media print{ button{display:none;} body{padding:12px;} }
    </style>
  </head><body>${bodyHtml}
  <script>window.onload=()=>{setTimeout(()=>window.print(),200);}</script>
  </body></html>`);
  w.document.close();
};

// ---- PDF table renderer (shared style: helvetica, NGN) ----
export type PdfSection = {
  title: string;
  headers: string[];
  widths: number[];     // column widths in pt; must sum to <= usable width
  rows: string[][];
  align?: ("left" | "right")[]; // per column, defaults to left for col 0, right otherwise
};
export type PdfReportOpts = {
  title: string;
  subtitle?: string;
  meta?: string[];      // lines under the title
  sections: PdfSection[];
  filename: string;
};

export const generatePdfReport = (opts: PdfReportOpts) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 36;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const footerH = 24;
  let y = margin;

  const ensure = (need: number) => {
    if (y + need > pageH - margin - footerH) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text(opts.title, margin, y); y += 18;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  if (opts.subtitle) { doc.text(opts.subtitle, margin, y); y += 12; }
  (opts.meta ?? []).forEach(line => { doc.text(line, margin, y); y += 12; });
  y += 4;

  for (const s of opts.sections) {
    ensure(28);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(s.title, margin, y); y += 14;
    doc.setFontSize(9);

    const align = s.align ?? s.headers.map((_, i) => (i === 0 ? "left" : "right"));
    const rowH = 14;
    const drawHeader = () => {
      ensure(rowH + 4);
      doc.setFont("helvetica", "bold");
      let x = margin;
      s.headers.forEach((h, i) => {
        const a = align[i];
        doc.text(h, a === "right" ? x + s.widths[i] - 2 : x + 2, y, { align: a });
        x += s.widths[i];
      });
      doc.setDrawColor(180);
      doc.line(margin, y + 3, margin + s.widths.reduce((a, b) => a + b, 0), y + 3);
      y += rowH;
      doc.setFont("helvetica", "normal");
    };
    drawHeader();
    for (const row of s.rows) {
      ensure(rowH);
      if (y === margin) drawHeader();
      let x = margin;
      row.forEach((cell, i) => {
        const a = align[i];
        const maxW = s.widths[i] - 4;
        const text = (doc.splitTextToSize(cell ?? "", maxW)[0] ?? cell ?? "") as string;
        doc.text(text, a === "right" ? x + s.widths[i] - 2 : x + 2, y, { align: a });
        x += s.widths[i];
      });
      y += rowH;
    }
    y += 8;
  }

  // Footer with page numbers
  const totalPages = doc.getNumberOfPages();
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setDrawColor(220);
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.line(margin, pageH - margin - footerH + 4, pageW - margin, pageH - margin - footerH + 4);
    doc.text(`Generated ${new Date().toLocaleString()}`, margin, pageH - margin - footerH + 16);
    doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - margin - footerH + 16, { align: "right" });
  }

  doc.save(opts.filename);
};