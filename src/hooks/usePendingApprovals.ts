import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PendingItem = {
  id: string;
  table: "aie_records" | "fund_inflows" | "distribution_batches" | "expenditures";
  label: string;
  amount: number | null;
  status: string;
  reason: "AWAITING_REVIEW" | "AWAITING_APPROVAL" | "RETURNED_TO_ME";
  created_at: string;
  href: string;
};

const MODULES = [
  { table: "aie_records",          path: "/aie",            label: "AIE",          nameField: "aie_no",        amountField: "amount" },
  { table: "fund_inflows",         path: "/fund-inflows",   label: "Inflow",       nameField: "reference_no",  amountField: "amount" },
  { table: "distribution_batches", path: "/distributions",  label: "Distribution", nameField: "period_month",  amountField: "distributed_total" },
  { table: "expenditures",         path: "/expenditures",   label: "Expenditure",  nameField: "voucher_no",    amountField: "gross_amount" },
] as const;

export function usePendingApprovals(pollMs = 60_000) {
  const { user, hasRole } = useAuth();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    const uid = user.id;
    const isOff = hasRole("BUDGET_OFF");
    const isDir = hasRole("BUDGET_DIR");
    const isClk = hasRole("BUDGET_CLK");

    const all: PendingItem[] = [];

    for (const m of MODULES) {
      const cols = `id, created_at, status, created_by, submitted_by, reviewed_by, ${m.nameField}, ${m.amountField}`;

      if (isOff) {
        const { data } = await (supabase.from(m.table) as any)
          .select(cols).eq("status", "SUBMITTED").neq("created_by", uid)
          .order("created_at", { ascending: true });
        (data ?? []).forEach((r: any) => {
          if (r.submitted_by && r.submitted_by === uid) return;
          all.push({
            id: r.id, table: m.table as any, label: `${m.label} ${r[m.nameField] ?? ""}`.trim(),
            amount: r[m.amountField] != null ? Number(r[m.amountField]) : null,
            status: r.status, reason: "AWAITING_REVIEW", created_at: r.created_at,
            href: `${m.path}?focus=${r.id}`,
          });
        });
      }
      if (isDir) {
        const { data } = await (supabase.from(m.table) as any)
          .select(cols).eq("status", "OFFICER_REVIEWED").neq("created_by", uid)
          .order("created_at", { ascending: true });
        (data ?? []).forEach((r: any) => {
          if ((r.submitted_by && r.submitted_by === uid) || (r.reviewed_by && r.reviewed_by === uid)) return;
          all.push({
            id: r.id, table: m.table as any, label: `${m.label} ${r[m.nameField] ?? ""}`.trim(),
            amount: r[m.amountField] != null ? Number(r[m.amountField]) : null,
            status: r.status, reason: "AWAITING_APPROVAL", created_at: r.created_at,
            href: `${m.path}?focus=${r.id}`,
          });
        });
      }
      if (isClk) {
        const { data } = await (supabase.from(m.table) as any)
          .select(cols).eq("status", "RETURNED").eq("created_by", uid)
          .order("created_at", { ascending: false });
        (data ?? []).forEach((r: any) => {
          all.push({
            id: r.id, table: m.table as any, label: `${m.label} ${r[m.nameField] ?? ""}`.trim(),
            amount: r[m.amountField] != null ? Number(r[m.amountField]) : null,
            status: r.status, reason: "RETURNED_TO_ME", created_at: r.created_at,
            href: `${m.path}?focus=${r.id}`,
          });
        });
      }
    }

    all.sort((a, b) => a.created_at < b.created_at ? 1 : -1);
    setItems(all);
    setLoading(false);
  }, [user, hasRole]);

  useEffect(() => {
    refresh();
    if (!pollMs) return;
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { items, loading, refresh };
}