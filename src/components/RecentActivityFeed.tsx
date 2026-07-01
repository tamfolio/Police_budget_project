import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Activity } from "lucide-react";
import { listAuditEntries, type AuditEntry } from "@/lib/auditApi";

const ENTITY_LABEL: Record<string, string> = {
  aie_records: "AIE",
  aie_lines: "AIE line",
  fund_inflows: "Fund inflow",
  distribution_batches: "Distribution",
  distribution_lines: "Distribution line",
  expenditures: "Expenditure",
  proposals: "Proposal",
  documents: "Document",
  user_roles: "User role",
};

const ACTION_CLASS: Record<string, string> = {
  INSERT: "text-emerald-600 dark:text-emerald-400",
  UPDATE: "text-primary",
  DELETE: "text-destructive",
};

export function RecentActivityFeed() {
  const { hasRole } = useAuth();
  const allowed = hasRole("AUDITOR") || hasRole("SYSADMIN") || hasRole("BUDGET_DIR");
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allowed) { setLoading(false); return; }
    (async () => {
      try {
        const { entries: data } = await listAuditEntries({ limit: 15 });
        setEntries(data);
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [allowed]);

  if (!allowed) return null;

  const actorName = (e: AuditEntry) => {
    if (!e.performedBy) return "system";
    return e.performedBy.fullName || e.performedBy.email || e.performedBy.id.slice(0, 8);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold font-serif">Recent activity</h2>
        </div>
        <span className="text-[11px] text-muted-foreground">{loading ? "Loading…" : `${entries.length} entr${entries.length === 1 ? "y" : "ies"}`}</span>
      </div>
      {entries.length === 0 && !loading ? (
        <p className="px-4 py-6 text-[12px] text-center text-muted-foreground">No activity recorded yet.</p>
      ) : (
        <ul className="divide-y divide-border max-h-[360px] overflow-auto">
          {entries.map(e => (
            <li key={e.id} className="px-4 py-2 flex items-center gap-2 text-[11.5px]">
              <span className={`font-mono uppercase text-[10px] tracking-wide w-14 shrink-0 ${ACTION_CLASS[e.action] ?? ""}`}>{e.action}</span>
              <span className="flex-1 min-w-0 truncate">
                <span className="font-medium">{actorName(e)}</span>
                <span className="text-muted-foreground"> · {ENTITY_LABEL[e.entityType] ?? e.entityType}</span>
              </span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
