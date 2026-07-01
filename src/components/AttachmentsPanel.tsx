import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Paperclip, Upload, FileText, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Doc = { id: string; bucket_path: string; mime_type: string | null; size_bytes: number | null; uploaded_by: string; created_at: string };

const BUCKET = "bms-documents";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export function AttachmentsPanel({
  recordType, recordId, canUpload, canDelete,
}: {
  recordType: "aie_records" | "fund_inflows" | "distribution_batches" | "expenditures" | "proposals" | "carry_over_periods";
  recordId: string;
  canUpload: boolean;
  canDelete: boolean;
}) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("documents")
      .select("id, bucket_path, mime_type, size_bytes, uploaded_by, created_at")
      .eq("linked_table", recordType)
      .eq("linked_id", recordId)
      .order("created_at", { ascending: false });
    setDocs((data ?? []) as Doc[]);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [recordType, recordId]);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    let ok = 0, failed = 0;
    for (const f of Array.from(files)) {
      if (f.size > MAX_BYTES) { toast.error(`${f.name} exceeds 10 MB.`); failed++; continue; }
      const safe = f.name.replace(/[^\w.\-]+/g, "_");
      const path = `${recordType}/${recordId}/${Date.now()}-${safe}`;
      const up = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type || undefined });
      if (up.error) { toast.error(`${f.name}: ${up.error.message}`); failed++; continue; }
      const { error: insErr } = await supabase.from("documents").insert({
        bucket_path: path, mime_type: f.type || null, size_bytes: f.size,
        linked_table: recordType, linked_id: recordId, uploaded_by: user!.id,
      });
      if (insErr) { toast.error(insErr.message); failed++; } else ok++;
    }
    setBusy(false);
    if (ok) toast.success(`${ok} file(s) uploaded.`);
    if (inputRef.current) inputRef.current.value = "";
    load();
  };

  const download = async (path: string) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) { toast.error(error?.message ?? "Could not get download URL."); return; }
    window.open(data.signedUrl, "_blank");
  };

  const remove = async (id: string, path: string) => {
    if (!confirm("Remove this attachment?")) return;
    await supabase.storage.from(BUCKET).remove([path]);
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removed."); load(); }
  };

  const fmtSize = (b: number | null) => b == null ? "—" : b < 1024 ? `${b} B` : b < 1024*1024 ? `${(b/1024).toFixed(1)} KB` : `${(b/(1024*1024)).toFixed(1)} MB`;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Paperclip className="h-3.5 w-3.5 text-primary" />
        <span className="text-[12px] font-semibold">Attachments</span>
        <span className="text-[10px] text-muted-foreground ml-auto">{loading ? "Loading…" : `${docs.length} file(s)`}</span>
      </div>
      <ul className="divide-y divide-border max-h-[220px] overflow-auto">
        {docs.length === 0 && !loading && (
          <li className="px-3 py-4 text-[11px] text-center text-muted-foreground italic">No attachments yet.</li>
        )}
        {docs.map(d => (
          <li key={d.id} className="px-3 py-1.5 flex items-center gap-2 text-[11.5px]">
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <button type="button" onClick={() => download(d.bucket_path)} className="flex-1 min-w-0 truncate text-primary hover:underline text-left">
              {d.bucket_path.split("/").pop()?.replace(/^\d+-/, "")}
            </button>
            <span className="text-[10px] text-muted-foreground tabular-nums">{fmtSize(d.size_bytes)}</span>
            {canDelete && (
              <button type="button" onClick={() => remove(d.id, d.bucket_path)} className="text-muted-foreground hover:text-destructive" title="Remove">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {canUpload && (
        <div className="px-3 py-2 border-t border-border">
          <input ref={inputRef} type="file" multiple className="hidden" onChange={e => upload(e.target.files)} />
          <Button type="button" size="sm" variant="outline" className="h-7 text-[11px] w-full"
            disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
            Upload file(s)
          </Button>
          <p className="text-[10px] text-muted-foreground mt-1">Max 10 MB per file.</p>
        </div>
      )}
    </div>
  );
}