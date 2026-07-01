import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Trash2, AtSign } from "lucide-react";
import { toast } from "sonner";
import { extractMentionTokens, resolveMentions, createMentionNotifications, recordLink } from "@/lib/mentions";

type Comment = { id: string; author: string; body: string; created_at: string };

export type CommentRecordType =
  | "aie_records" | "fund_inflows" | "distribution_batches" | "expenditures"
  | "proposals" | "carry_over_periods";

export function TxnCommentsThread({
  recordType, recordId, compact = false,
}: { recordType: CommentRecordType; recordId: string; compact?: boolean }) {
  const { user, hasRole } = useAuth();
  const isSys = hasRole("SYSADMIN");
  const [items, setItems] = useState<Comment[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [people, setPeople] = useState<{ user_id: string; full_name: string | null; email: string | null }[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestQuery, setSuggestQuery] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles")
        .select("user_id, full_name, email").eq("is_active", true).limit(500);
      setPeople(data ?? []);
    })();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("txn_comments")
      .select("id, author, body, created_at")
      .eq("record_type", recordType)
      .eq("record_id", recordId)
      .order("created_at", { ascending: true });
    const list = (data ?? []) as Comment[];
    setItems(list);
    const ids = Array.from(new Set(list.map(c => c.author)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles")
        .select("user_id, full_name, email").in("user_id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.user_id] = p.full_name || p.email || p.user_id.slice(0,8); });
      setAuthors(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [recordType, recordId]);

  const post = async () => {
    const text = body.trim();
    if (!text) { toast.error("Comment is empty."); return; }
    if (text.length > 4000) { toast.error("Max 4000 characters."); return; }
    setPosting(true);
    const { error } = await supabase.from("txn_comments")
      .insert({ record_type: recordType, record_id: recordId, author: user!.id, body: text });
    if (!error) {
      const tokens = extractMentionTokens(text);
      if (tokens.length) {
        try {
          const recipients = await resolveMentions(tokens);
          if (recipients.length) {
            await createMentionNotifications({
              recipients, actor: user!.id,
              recordType, recordId,
              snippet: text,
              link: recordLink(recordType, recordId),
            });
            toast.success(`Posted · notified ${recipients.length} user(s)`);
          }
        } catch { /* non-blocking */ }
      }
    }
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    setBody(""); load();
  };

  const onBodyChange = (val: string) => {
    setBody(val);
    const at = val.lastIndexOf("@");
    if (at >= 0) {
      const after = val.slice(at + 1);
      if (/^[A-Za-z0-9._\-@]{0,30}$/.test(after) && (at === 0 || /\s/.test(val[at - 1]))) {
        setSuggestQuery(after.toLowerCase());
        setSuggestOpen(true);
        return;
      }
    }
    setSuggestOpen(false);
  };

  const insertMention = (p: { full_name: string | null; email: string | null }) => {
    const handle = (p.email?.split("@")[0]) || (p.full_name ?? "").replace(/\s+/g, "");
    if (!handle) return;
    const at = body.lastIndexOf("@");
    const before = at >= 0 ? body.slice(0, at) : body;
    setBody(`${before}@${handle} `);
    setSuggestOpen(false);
  };

  const suggestions = suggestOpen
    ? people.filter(p => {
        const q = suggestQuery;
        if (!q) return true;
        return (p.email ?? "").toLowerCase().includes(q) || (p.full_name ?? "").toLowerCase().includes(q);
      }).slice(0, 6)
    : [];

  const remove = async (id: string) => {
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("txn_comments").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className={compact ? "" : "rounded-lg border border-border bg-card"}>
      {!compact && (
        <div className="px-3 py-2 border-b border-border flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-primary" />
          <span className="text-[12px] font-semibold">Comments</span>
          <span className="text-[10px] text-muted-foreground ml-auto">{loading ? "Loading…" : `${items.length} comment(s)`}</span>
        </div>
      )}
      <div className="px-3 py-2 space-y-2 max-h-[280px] overflow-auto">
        {items.length === 0 && !loading && (
          <p className="text-[11px] text-muted-foreground italic">No comments yet.</p>
        )}
        {items.map(c => (
          <div key={c.id} className="flex items-start gap-2 text-[12px]">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="font-medium text-foreground">{authors[c.author] ?? c.author.slice(0,8)}</span>
                <span>·</span>
                <span>{new Date(c.created_at).toLocaleString()}</span>
              </div>
              <p className="whitespace-pre-wrap break-words">{c.body}</p>
            </div>
            {isSys && (
              <button type="button" onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive" title="Delete">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="px-3 py-2 border-t border-border space-y-2">
        <div className="relative">
          <Textarea
            value={body} onChange={e => onBodyChange(e.target.value)}
            placeholder="Add a comment… use @ to mention"
            className="min-h-[60px] text-[12px]"
            maxLength={4000}
          />
          {suggestions.length > 0 && (
            <div className="absolute bottom-full mb-1 left-0 right-0 z-20 rounded-md border border-border bg-popover shadow-md max-h-[180px] overflow-auto">
              {suggestions.map(p => (
                <button
                  key={p.user_id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); insertMention(p); }}
                  className="w-full text-left px-2 py-1.5 hover:bg-accent flex items-center gap-2 text-[11px]"
                >
                  <AtSign className="h-3 w-3 text-primary" />
                  <span className="font-medium">{p.full_name || p.email}</span>
                  {p.email && <span className="text-muted-foreground">· {p.email}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">{body.length}/4000 · type @ to mention</span>
          <Button type="button" size="sm" className="h-7 text-[11px]" onClick={post} disabled={posting || !body.trim()}>
            <Send className="h-3 w-3 mr-1" />Post
          </Button>
        </div>
      </div>
    </div>
  );
}