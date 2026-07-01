import { supabase } from "@/integrations/supabase/client";

export type BulkAction = "REVIEW" | "APPROVE" | "RETURN";

/**
 * Apply the same transition to every selected record in `table`, recording
 * an approval_actions entry per row. Each row is attempted independently so
 * a single RLS rejection does not abort the rest.
 */
export async function runBulkTxnAction(opts: {
  table: "aie_records" | "fund_inflows" | "distribution_batches" | "expenditures";
  ids: string[];
  action: BulkAction;
  actorId: string;
  remarks?: string;
}): Promise<{ ok: number; failed: number }> {
  const now = new Date().toISOString();
  let patch: Record<string, any> = {};
  if (opts.action === "REVIEW") patch = { status: "OFFICER_REVIEWED", reviewed_by: opts.actorId, reviewed_at: now };
  else if (opts.action === "APPROVE") patch = { status: "APPROVED", approved_by: opts.actorId, approved_at: now };
  else patch = { status: "RETURNED", return_remarks: (opts.remarks ?? "").trim() };

  const results = await Promise.allSettled(
    opts.ids.map(async (id) => {
      const upd = await supabase.from(opts.table).update(patch).eq("id", id);
      if (upd.error) throw upd.error;
      const ins = await supabase.from("approval_actions").insert({
        record_type: opts.table, record_id: id, actor: opts.actorId,
        action: opts.action, remarks: opts.remarks?.trim() || null,
      });
      if (ins.error) throw ins.error;
    })
  );
  let ok = 0, failed = 0;
  results.forEach(r => r.status === "fulfilled" ? ok++ : failed++);
  return { ok, failed };
}