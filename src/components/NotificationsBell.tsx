import { useEffect, useState, useCallback } from "react";
import { Bell, AtSign, Check, Trash2, ArrowRight, Clock, RotateCcw, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePendingApprovals } from "@/hooks/usePendingApprovals";

type Notif = {
  id: string; kind: string; title: string; body: string | null;
  link: string | null; read_at: string | null; created_at: string;
};

const REASON_META = {
  AWAITING_REVIEW:   { label: "Awaiting review",   icon: Clock,        cls: "text-amber-600 dark:text-amber-400" },
  AWAITING_APPROVAL: { label: "Awaiting approval", icon: CheckCircle2, cls: "text-primary" },
  RETURNED_TO_ME:    { label: "Returned",          icon: RotateCcw,    cls: "text-destructive" },
} as const;

export function NotificationsBell() {
  const { user } = useAuth();
  const { items: workflowItems, loading: workflowLoading } = usePendingApprovals();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(true);

  const loadNotifs = useCallback(async () => {
    if (!user) return;
    setNotifsLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("id, kind, title, body, link, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifs((data ?? []) as Notif[]);
    setNotifsLoading(false);
  }, [user]);

  useEffect(() => { loadNotifs(); }, [loadNotifs]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => loadNotifs())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, loadNotifs]);

  const unread = notifs.filter(i => !i.read_at).length;
  const totalBadge = workflowItems.length + unread;

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id).is("read_at", null);
    loadNotifs();
  };
  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    loadNotifs();
  };
  const remove = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    loadNotifs();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Notifications (${totalBadge})`}
        >
          <Bell className="h-4 w-4" />
          {totalBadge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-[16px] h-4 px-1 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-semibold leading-none">
              {totalBadge > 99 ? "99+" : totalBadge}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[360px] p-0 max-h-[520px] flex flex-col">
        {/* ── Pending actions ─────────────────────────────── */}
        <div className="px-3 py-2 border-b border-border flex items-center justify-between shrink-0">
          <span className="text-[12px] font-semibold">Pending actions</span>
          <span className="text-[10px] text-muted-foreground">
            {workflowLoading ? "Loading…" : `${workflowItems.length} item(s)`}
          </span>
        </div>
        {workflowItems.length === 0 ? (
          <p className="px-3 py-3 text-[11px] text-center text-muted-foreground shrink-0">Nothing waiting on you.</p>
        ) : (
          <ul className="max-h-[180px] overflow-auto divide-y divide-border shrink-0">
            {workflowItems.slice(0, 10).map(it => {
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
        <Link
          to="/dashboard"
          className="block px-3 py-1.5 border-t border-border text-center text-[11px] text-primary hover:bg-accent/40 shrink-0"
        >
          View on dashboard
        </Link>

        {/* ── Notifications ────────────────────────────────── */}
        <div className="px-3 py-2 border-t border-border flex items-center justify-between shrink-0">
          <span className="text-[12px] font-semibold">Notifications</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              {notifsLoading ? "Loading…" : `${unread} unread`}
            </span>
            {unread > 0 && (
              <button onClick={markAll} className="text-[10px] text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>
        </div>
        {notifs.length === 0 ? (
          <p className="px-3 py-3 text-[11px] text-center text-muted-foreground shrink-0">No notifications.</p>
        ) : (
          <ul className="overflow-auto divide-y divide-border">
            {notifs.map(n => (
              <li key={n.id} className={`px-3 py-2 ${n.read_at ? "" : "bg-accent/10"}`}>
                <div className="flex items-start gap-2">
                  <AtSign className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    {n.link ? (
                      <Link
                        to={n.link}
                        onClick={() => markOne(n.id)}
                        className="text-[11px] font-medium hover:underline block truncate"
                      >
                        {n.title}
                      </Link>
                    ) : (
                      <p className="text-[11px] font-medium truncate">{n.title}</p>
                    )}
                    {n.body && <p className="text-[10px] text-muted-foreground line-clamp-2">{n.body}</p>}
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.read_at && (
                      <button
                        onClick={() => markOne(n.id)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Mark read"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={() => remove(n.id)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
