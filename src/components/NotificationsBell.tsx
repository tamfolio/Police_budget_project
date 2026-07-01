import { useEffect, useState, useCallback } from "react";
import { Bell, AtSign, Check, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Notif = {
  id: string; kind: string; title: string; body: string | null;
  link: string | null; read_at: string | null; created_at: string;
};

export function NotificationsBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("id, kind, title, body, link, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data ?? []) as Notif[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  const unread = items.filter(i => !i.read_at).length;

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id).is("read_at", null);
    load();
  };
  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    load();
  };
  const remove = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    load();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
          aria-label={`Notifications (${unread})`}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-[16px] h-4 px-1 items-center justify-center rounded-full bg-accent text-accent-foreground text-[9px] font-semibold leading-none">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-[12px] font-semibold">Notifications</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">{loading ? "Loading…" : `${unread} unread`}</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-[10px] text-primary hover:underline">Mark all read</button>
            )}
          </div>
        </div>
        {items.length === 0 ? (
          <p className="px-3 py-6 text-[11px] text-center text-muted-foreground">No notifications.</p>
        ) : (
          <ul className="max-h-[380px] overflow-auto divide-y divide-border">
            {items.map(n => (
              <li key={n.id} className={`px-3 py-2 ${n.read_at ? "" : "bg-accent/10"}`}>
                <div className="flex items-start gap-2">
                  <AtSign className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    {n.link ? (
                      <Link to={n.link} onClick={() => markOne(n.id)} className="text-[11px] font-medium hover:underline block truncate">
                        {n.title}
                      </Link>
                    ) : (
                      <p className="text-[11px] font-medium truncate">{n.title}</p>
                    )}
                    {n.body && <p className="text-[10px] text-muted-foreground line-clamp-2">{n.body}</p>}
                    <p className="text-[9px] text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!n.read_at && (
                      <button onClick={() => markOne(n.id)} className="text-muted-foreground hover:text-foreground" title="Mark read">
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                    <button onClick={() => remove(n.id)} className="text-muted-foreground hover:text-destructive" title="Delete">
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