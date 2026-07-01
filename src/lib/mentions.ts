import { supabase } from "@/integrations/supabase/client";

export type Mentionable = { user_id: string; full_name: string | null; email: string | null };

// Matches @token where token can contain letters, digits, dot, underscore, hyphen, @
const MENTION_RE = /(^|\s)@([A-Za-z0-9._\-@]+)/g;

export function extractMentionTokens(body: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = MENTION_RE.exec(body)) !== null) {
    out.add(m[2].toLowerCase());
  }
  return Array.from(out);
}

/** Resolve @tokens against profiles. Matches by exact email, email local-part, or full_name slug. */
export async function resolveMentions(tokens: string[]): Promise<Mentionable[]> {
  if (!tokens.length) return [];
  const { data } = await supabase.from("profiles").select("user_id, full_name, email");
  const all = (data ?? []) as Mentionable[];
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const matched = new Map<string, Mentionable>();
  for (const t of tokens) {
    const tk = t.toLowerCase();
    const tkSlug = slug(tk);
    for (const p of all) {
      const email = (p.email ?? "").toLowerCase();
      const local = email.split("@")[0];
      const name = slug(p.full_name ?? "");
      if (email === tk || local === tk || name === tkSlug) {
        matched.set(p.user_id, p);
      }
    }
  }
  return Array.from(matched.values());
}

export async function createMentionNotifications(opts: {
  recipients: Mentionable[];
  actor: string;
  recordType: string;
  recordId: string;
  snippet: string;
  link: string;
}) {
  const { recipients, actor, recordType, recordId, snippet, link } = opts;
  const rows = recipients
    .filter(r => r.user_id !== actor)
    .map(r => ({
      user_id: r.user_id,
      kind: "mention",
      title: "You were mentioned in a comment",
      body: snippet.slice(0, 280),
      link,
      source_type: recordType,
      source_id: recordId,
      actor,
    }));
  if (!rows.length) return;
  await supabase.from("notifications").insert(rows);
}

/** Build a deep-link for a given txn record type & id. */
export function recordLink(recordType: string, recordId: string): string {
  const map: Record<string, string> = {
    aie_records: "/aie",
    fund_inflows: "/fund-inflows",
    distribution_batches: "/distributions",
    expenditures: "/expenditures",
    proposals: "/proposals",
    carry_over_periods: "/carry-over",
  };
  const base = map[recordType] ?? "/";
  return `${base}?focus=${recordId}`;
}