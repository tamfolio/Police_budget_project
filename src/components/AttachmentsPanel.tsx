import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Upload, FileText, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listStorageObjects,
  uploadFile,
  getDownloadUrl,
  deleteStorageObject,
} from "@/lib/storageApi";

type Doc = { key: string; name: string };

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export function AttachmentsPanel({
  recordType, recordId, canUpload, canDelete,
}: {
  recordType: "aie_records" | "fund_inflows" | "distribution_batches" | "expenditures" | "proposals" | "carry_over_periods";
  recordId: string;
  canUpload: boolean;
  canDelete: boolean;
}) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const prefix = `${recordType}/${recordId}/`;

  const load = async () => {
    setLoading(true);
    try {
      const res = await listStorageObjects(prefix);
      setDocs(
        (res.objects ?? []).map(o => ({
          key: o.key,
          name: o.key.split("/").pop()?.replace(/^\d+-/, "") ?? o.key,
        })),
      );
    } catch {
      // leave previous state on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [recordType, recordId]);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    let ok = 0, failed = 0;
    for (const f of Array.from(files)) {
      if (f.size > MAX_BYTES) { toast.error(`${f.name} exceeds 10 MB.`); failed++; continue; }
      try {
        await uploadFile(f, `${recordType}/${recordId}`);
        ok++;
      } catch (e) {
        toast.error(`${f.name}: ${e instanceof Error ? e.message : "Upload failed."}`);
        failed++;
      }
    }
    setBusy(false);
    if (ok) { toast.success(`${ok} file(s) uploaded.`); load(); }
    if (inputRef.current) inputRef.current.value = "";
  };

  const download = async (key: string) => {
    try {
      const res = await getDownloadUrl(key);
      window.open(res.downloadUrl, "_blank");
    } catch {
      toast.error("Could not get download URL.");
    }
  };

  const remove = async (key: string) => {
    if (!confirm("Remove this attachment?")) return;
    try {
      await deleteStorageObject(key);
      toast.success("Removed.");
      load();
    } catch {
      toast.error("Could not remove file.");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Paperclip className="h-3.5 w-3.5 text-primary" />
        <span className="text-[12px] font-semibold">Attachments</span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {loading ? "Loading…" : `${docs.length} file(s)`}
        </span>
      </div>
      <ul className="divide-y divide-border max-h-[220px] overflow-auto">
        {docs.length === 0 && !loading && (
          <li className="px-3 py-4 text-[11px] text-center text-muted-foreground italic">
            No attachments yet.
          </li>
        )}
        {docs.map(d => (
          <li key={d.key} className="px-3 py-1.5 flex items-center gap-2 text-[11.5px]">
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <button
              type="button"
              onClick={() => download(d.key)}
              className="flex-1 min-w-0 truncate text-primary hover:underline text-left"
            >
              {d.name}
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => remove(d.key)}
                className="text-muted-foreground hover:text-destructive"
                title="Remove"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {canUpload && (
        <div className="px-3 py-2 border-t border-border">
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => upload(e.target.files)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-[11px] w-full"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy
              ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              : <Upload className="h-3 w-3 mr-1" />}
            Upload file(s)
          </Button>
          <p className="text-[10px] text-muted-foreground mt-1">Max 10 MB per file.</p>
        </div>
      )}
    </div>
  );
}
