import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { listAuditEntries, type AuditEntry } from "@/lib/auditApi";

/**
 * For a RETURNED record, fetches the most recent audit entries and shows
 * old→new for each field that changed since the record was returned.
 * Only visible to roles that can read audit events (auditor / director / sysadmin).
 */
export function ReturnDiffView({
  recordType, recordId, fields,
}: { recordType: string; recordId: string; fields: { key: string; label: string; fmt?: (v: any) => string }[] }) {
  const [returnedEntry, setReturnedEntry] = useState<AuditEntry | null>(null);
  const [latestEntry, setLatestEntry] = useState<AuditEntry | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { entries } = await listAuditEntries({ entityType: recordType, entityId: recordId, limit: 20 });
        const updates = entries.filter(e => e.action === "UPDATE");
        const returned = updates.find(e =>
          e.changes?.status?.new === "RETURNED" && e.changes?.status?.old !== "RETURNED"
        );
        const latest = updates[0] ?? null;
        setReturnedEntry(returned ?? null);
        setLatestEntry(latest);
      } catch {
        setDenied(true);
      }
    })();
  }, [recordType, recordId]);

  if (denied || !returnedEntry || !latestEntry) return null;
  if (returnedEntry.id === latestEntry.id) return null;

  const rows = fields
    .map(f => ({
      ...f,
      b: returnedEntry.changes?.[f.key]?.old,
      a: latestEntry.changes?.[f.key]?.new,
    }))
    .filter(r => String(r.b ?? "") !== String(r.a ?? ""));

  if (rows.length === 0) return null;

  const fmt = (f: any, v: any) => (f.fmt ? f.fmt(v) : v == null || v === "" ? "—" : String(v));

  return (
    <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-[11.5px]">
      <div className="flex items-center gap-1.5 mb-2 text-primary">
        <RotateCcw className="h-3.5 w-3.5" />
        <span className="font-semibold">Changes since this was returned</span>
      </div>
      <table className="w-full">
        <thead className="text-[10px] uppercase text-muted-foreground">
          <tr><th className="text-left p-1">Field</th><th className="text-left p-1">Before</th><th className="text-left p-1">Now</th></tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} className="border-t border-border/60 align-top">
              <td className="p-1 text-muted-foreground">{r.label}</td>
              <td className="p-1 line-through opacity-70">{fmt(r, r.b)}</td>
              <td className="p-1 font-medium">{fmt(r, r.a)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
