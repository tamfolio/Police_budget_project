import { Bell, ArrowRight, Clock, RotateCcw, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePendingApprovals } from "@/hooks/usePendingApprovals";

const REASON_META = {
  AWAITING_REVIEW:   { label: "Awaiting review",   icon: Clock,        cls: "text-amber-600 dark:text-amber-400" },
  AWAITING_APPROVAL: { label: "Awaiting approval", icon: CheckCircle2, cls: "text-primary" },
  RETURNED_TO_ME:    { label: "Returned",          icon: RotateCcw,    cls: "text-destructive" },
} as const;

export function PendingApprovalsBell() {
  const { items, loading } = usePendingApprovals();
  const count = items.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Pending actions (${count})`}
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-[16px] h-4 px-1 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-semibold leading-none">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-[12px] font-semibold">Pending actions</span>
          <span className="text-[10px] text-muted-foreground">{loading ? "Loading…" : `${count} item(s)`}</span>
        </div>
        {count === 0 ? (
          <p className="px-3 py-6 text-[11px] text-center text-muted-foreground">Nothing waiting on you.</p>
        ) : (
          <ul className="max-h-[340px] overflow-auto divide-y divide-border">
            {items.slice(0, 15).map(it => {
              const meta = REASON_META[it.reason];
              const Icon = meta.icon;
              return (
                <li key={`${it.table}:${it.id}`}>
                  <Link to={it.href} className="flex items-center gap-2 px-3 py-2 hover:bg-accent/40 group">
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.cls}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium truncate">{it.label || "(no reference)"}</p>
                      <p className={`text-[10px] ${meta.cls}`}>{meta.label}</p>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <Link to="/dashboard" className="block px-3 py-2 border-t border-border text-center text-[11px] text-primary hover:bg-accent/40">
          View on dashboard
        </Link>
      </PopoverContent>
    </Popover>
  );
}