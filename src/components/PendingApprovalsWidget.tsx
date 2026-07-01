import { Link } from "react-router-dom";
import { usePendingApprovals } from "@/hooks/usePendingApprovals";
import { Inbox, ArrowRight, Clock, RotateCcw, CheckCircle2 } from "lucide-react";

const fmt = (n: number | null) =>
  n == null ? "—" : new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

const REASON_META = {
  AWAITING_REVIEW:   { label: "Awaiting your review",   icon: Clock,        cls: "text-amber-600 dark:text-amber-400" },
  AWAITING_APPROVAL: { label: "Awaiting your approval", icon: CheckCircle2, cls: "text-primary" },
  RETURNED_TO_ME:    { label: "Returned to you",        icon: RotateCcw,    cls: "text-destructive" },
} as const;

export function PendingApprovalsWidget() {
  const { items, loading } = usePendingApprovals();

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold font-serif">Pending actions</h2>
        </div>
        <span className="text-[11px] text-muted-foreground">{loading ? "Loading…" : `${items.length} item(s)`}</span>
      </div>
      {items.length === 0 && !loading ? (
        <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
          You're all caught up — nothing waiting on you right now.
        </div>
      ) : (
        <ul className="divide-y divide-border max-h-[360px] overflow-auto">
          {items.slice(0, 25).map(it => {
            const meta = REASON_META[it.reason];
            const Icon = meta.icon;
            return (
              <li key={`${it.table}:${it.id}`}>
                <Link
                  to={it.href}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40 transition-colors group"
                >
                  <Icon className={`h-4 w-4 shrink-0 ${meta.cls}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium truncate">{it.label || "(no reference)"}</p>
                    <p className={`text-[10px] ${meta.cls}`}>{meta.label}</p>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">{fmt(it.amount)}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}