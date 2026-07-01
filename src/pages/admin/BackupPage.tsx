import { useEffect, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Database, Download, FileArchive, FileText, Loader2, RefreshCw, ShieldAlert, Paperclip, CloudUpload } from "lucide-react";

const TABLES = [
  "profiles", "user_roles", "fiscal_years", "budget_categories", "budget_sub_items",
  "formations", "fund_inflows", "aie_records", "aie_lines",
  "distribution_batches", "distribution_lines", "expenditures", "proposals",
  "carry_over_periods", "carry_over_lines", "approval_actions", "approval_delegations",
  "txn_comments", "notifications", "documents", "audit_log", "export_audit_log",
  "app_settings",
] as const;

const BUCKET = "bms-documents";
const PAGE = 1000;

type Counts = Record<string, number | null>;
type DocRow = { id: string; bucket_path: string; mime_type: string | null; size_bytes: number | null; linked_table: string | null; linked_id: string | null; uploaded_by: string; created_at: string };

function toCSV(rows: any[]): string {
  if (!rows.length) return "";
  const colSet = new Set<string>();
  rows.forEach(r => Object.keys(r).forEach(k => colSet.add(k)));
  const cols = Array.from(colSet);
  const esc = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map(r => cols.map(c => esc(r[c])).join(","))].join("\n");
}

async function fetchAll(table: string): Promise<any[]> {
  const out: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await (supabase as any).from(table).select("*").range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || !data.length) break;
    out.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

export default function BackupPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("SYSADMIN");
  const [counts, setCounts] = useState<Counts>({});
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null);
  const [syncResult, setSyncResult] = useState<any>(null);

  const refresh = async () => {
    setLoading(true);
    const entries = await Promise.all(TABLES.map(async t => {
      const { count, error } = await (supabase as any).from(t).select("*", { count: "exact", head: true });
      return [t, error ? null : (count ?? 0)] as const;
    }));
    setCounts(Object.fromEntries(entries));
    const { data } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
    setDocs((data ?? []) as DocRow[]);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
          <ShieldAlert className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <h2 className="text-lg font-bold font-serif">Access restricted</h2>
            <p className="text-sm text-muted-foreground mt-1">The Central Repository is reserved for System Administrators.</p>
          </div>
        </div>
      </div>
    );
  }

  const downloadTableCSV = async (t: string) => {
    setBusy(`table:${t}`);
    try {
      const rows = await fetchAll(t);
      const csv = toCSV(rows);
      saveAs(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${t}.csv`);
      toast.success(`${t}.csv exported (${rows.length} rows)`);
    } catch (e: any) {
      toast.error(`${t}: ${e.message ?? e}`);
    } finally { setBusy(null); }
  };

  const downloadTableJSON = async (t: string) => {
    setBusy(`json:${t}`);
    try {
      const rows = await fetchAll(t);
      saveAs(new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }), `${t}.json`);
      toast.success(`${t}.json exported (${rows.length} rows)`);
    } catch (e: any) {
      toast.error(`${t}: ${e.message ?? e}`);
    } finally { setBusy(null); }
  };

  const downloadDoc = async (path: string) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) { toast.error(error?.message ?? "Could not get download URL."); return; }
    window.open(data.signedUrl, "_blank");
  };

  const fullBackup = async (includeFiles: boolean) => {
    setBusy("full");
    const zip = new JSZip();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const meta: any = { generated_at: new Date().toISOString(), tables: {}, documents: { count: 0, included_files: includeFiles } };
    try {
      // Tables
      const tablesDir = zip.folder("tables")!;
      for (let i = 0; i < TABLES.length; i++) {
        const t = TABLES[i];
        setProgress({ label: `Exporting ${t}…`, done: i, total: TABLES.length + (includeFiles ? 1 : 0) });
        try {
          const rows = await fetchAll(t);
          tablesDir.file(`${t}.csv`, toCSV(rows));
          tablesDir.file(`${t}.json`, JSON.stringify(rows, null, 2));
          meta.tables[t] = { rows: rows.length };
        } catch (e: any) {
          meta.tables[t] = { error: e.message ?? String(e) };
        }
      }
      // Documents
      if (includeFiles) {
        setProgress({ label: `Downloading ${docs.length} document(s)…`, done: TABLES.length, total: TABLES.length + 1 });
        const docsDir = zip.folder("documents")!;
        let ok = 0;
        for (const d of docs) {
          try {
            const { data, error } = await supabase.storage.from(BUCKET).download(d.bucket_path);
            if (error || !data) continue;
            const safe = d.bucket_path.replace(/[^\w./\-]+/g, "_");
            docsDir.file(safe, data);
            ok++;
          } catch { /* skip */ }
        }
        meta.documents.count = ok;
      }
      zip.file("manifest.json", JSON.stringify(meta, null, 2));
      zip.file("README.txt", `NPF Budget Office — Central Repository Backup
Generated: ${meta.generated_at}

Contents:
- /tables/<name>.csv and .json — full dump of every database table.
- /documents/...           — original uploaded files (when included).
- manifest.json            — row counts and any errors.
`);
      setProgress({ label: "Compressing archive…", done: TABLES.length + (includeFiles ? 1 : 0), total: TABLES.length + (includeFiles ? 1 : 0) });
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      saveAs(blob, `npf-bms-backup-${stamp}.zip`);
      toast.success("Backup downloaded.");
    } catch (e: any) {
      toast.error(`Backup failed: ${e.message ?? e}`);
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  const totalRows = Object.values(counts).reduce<number>((s, n) => s + (n ?? 0), 0);
  const totalBytes = docs.reduce((s, d) => s + (d.size_bytes ?? 0), 0);
  const fmtSize = (b: number) => b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b/1024).toFixed(1)} KB` : `${(b/(1024*1024)).toFixed(1)} MB`;

  const syncExternal = async () => {
    setBusy("sync");
    setSyncResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("sync-to-external", { body: {} });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.info("Sync started in background. Refreshing status…");
      // Poll status from app_settings
      const started = Date.now();
      while (Date.now() - started < 5 * 60 * 1000) {
        await new Promise(r => setTimeout(r, 2500));
        const { data: row } = await supabase.from("app_settings").select("value").eq("key", "external_sync_status").maybeSingle();
        const v = (row?.value ?? null) as any;
        if (v) {
          setSyncResult(v);
          if (v.state === "done") {
            const errs = v.errors ?? [];
            if (errs.length) toast.warning(`Synced with ${errs.length} table error(s).`);
            else toast.success(`Synced ${v.total_rows ?? 0} rows to external database.`);
            break;
          }
          if (v.state === "error") { toast.error(`Sync error: ${v.error}`); break; }
        }
      }
    } catch (e: any) {
      toast.error(`Sync failed: ${e.message ?? e}`);
    } finally { setBusy(null); }
  };

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" /> Central Repository
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Full visibility of every database table and uploaded document. Download individual tables, individual files, or one complete backup archive.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </header>

      <section className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tables</p>
          <p className="text-2xl font-bold tabular-nums">{TABLES.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total rows</p>
          <p className="text-2xl font-bold tabular-nums">{totalRows.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Documents</p>
          <p className="text-2xl font-bold tabular-nums">{docs.length} <span className="text-xs font-normal text-muted-foreground">({fmtSize(totalBytes)})</span></p>
        </div>
      </section>

      <section className="rounded-lg border border-accent/40 bg-accent/5 p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <FileArchive className="h-8 w-8 text-accent" />
          <div>
            <p className="font-semibold text-sm">Full system backup</p>
            <p className="text-xs text-muted-foreground">One ZIP containing every table (CSV + JSON) and every uploaded document.</p>
            {progress && (
              <p className="text-[11px] mt-1 text-primary">{progress.label} ({progress.done}/{progress.total})</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fullBackup(false)} disabled={!!busy}>
            {busy === "full" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
            Data only (.zip)
          </Button>
          <Button size="sm" onClick={() => fullBackup(true)} disabled={!!busy}>
            {busy === "full" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
            Full backup (data + files)
          </Button>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
          <Database className="h-4 w-4" /> Database tables
        </h2>
      </section>
      <section className="rounded-lg border border-primary/40 bg-primary/5 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <CloudUpload className="h-8 w-8 text-primary" />
            <div>
              <p className="font-semibold text-sm">Sync to external Postgres</p>
              <p className="text-xs text-muted-foreground">
                Mirrors every table into the <code className="font-mono">lovable_mirror</code> schema on your configured external database. Idempotent — safe to re-run.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={syncExternal} disabled={!!busy}>
            {busy === "sync" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CloudUpload className="h-3.5 w-3.5 mr-1.5" />}
            Sync now
          </Button>
        </div>
        {syncResult && (
          <div className="text-xs bg-background/60 border border-border rounded p-2 max-h-48 overflow-y-auto font-mono">
            <div>State: {syncResult.state} {syncResult.tables_done != null && `(${syncResult.tables_done}/${syncResult.tables_total} tables)`}</div>
            {syncResult.total_rows != null && <div>Total rows: {syncResult.total_rows}</div>}
            {(syncResult.errors ?? []).length > 0 && (
              <div className="mt-1 text-destructive">
                Errors:
                {syncResult.errors.map((e: any) => <div key={e.table}>• {e.table}: {e.error}</div>)}
              </div>
            )}
          </div>
        )}
      </section>
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
          <Database className="h-4 w-4" /> Database tables
        </h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 w-10">S/N</th>
                <th className="text-left px-3 py-2">Table</th>
                <th className="text-right px-3 py-2">Rows</th>
                <th className="text-right px-3 py-2 w-[220px]">Export</th>
              </tr>
            </thead>
            <tbody>
              {TABLES.map((t, _i) => (
                <tr key={t} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-1.5 text-xs text-muted-foreground tabular-nums">{_i + 1}</td>
                  <td className="px-3 py-1.5 font-mono text-[12px]">{t}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{counts[t] === null ? "—" : (counts[t] ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-1.5 text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-[11px]" disabled={!!busy} onClick={() => downloadTableCSV(t)}>
                      {busy === `table:${t}` ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <FileText className="h-3 w-3 mr-1" />} CSV
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-[11px]" disabled={!!busy} onClick={() => downloadTableJSON(t)}>
                      {busy === `json:${t}` ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <FileText className="h-3 w-3 mr-1" />} JSON
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
          <Paperclip className="h-4 w-4" /> Documents ({docs.length})
        </h2>
        <div className="rounded-lg border border-border overflow-hidden max-h-[480px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 w-10">S/N</th>
                <th className="text-left px-3 py-2">File</th>
                <th className="text-left px-3 py-2">Linked to</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-right px-3 py-2">Size</th>
                <th className="text-left px-3 py-2">Uploaded</th>
                <th className="text-right px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground italic">No documents uploaded yet.</td></tr>
              )}
              {docs.map((d, _i) => (
                <tr key={d.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-1.5 text-xs text-muted-foreground tabular-nums">{_i + 1}</td>
                  <td className="px-3 py-1.5 max-w-[260px] truncate" title={d.bucket_path}>
                    {d.bucket_path.split("/").pop()?.replace(/^\d+-/, "")}
                  </td>
                  <td className="px-3 py-1.5">
                    {d.linked_table ? <Badge variant="outline" className="text-[10px] font-mono">{d.linked_table}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-3 py-1.5 text-[11px] text-muted-foreground">{d.mime_type ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-[11px]">{d.size_bytes != null ? fmtSize(d.size_bytes) : "—"}</td>
                  <td className="px-3 py-1.5 text-[11px] text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-1.5 text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => downloadDoc(d.bucket_path)}>
                      <Download className="h-3 w-3 mr-1" /> Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}