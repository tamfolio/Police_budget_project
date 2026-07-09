import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { listAies } from "@/lib/aiesApi";
import { listFundInflows } from "@/lib/fundInflowsApi";
import { listExpenditures } from "@/lib/expendituresApi";

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

export function usePendingApprovals(pollMs = 60_000) {
  const { hasRole } = useAuth();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const isOff = hasRole("BUDGET_OFF");
    const isDir = hasRole("BUDGET_DIR");
    const isClk = hasRole("BUDGET_CLK");

    const all: PendingItem[] = [];

    try {
      if (isOff) {
        const [aies, inflows, exps] = await Promise.all([
          listAies({ status: "PENDING_REVIEW" }),
          listFundInflows({ status: "PENDING_REVIEW" }),
          listExpenditures({ status: "SUBMITTED" }),
        ]);
        aies.forEach(r => all.push({
          id: r.id, table: "aie_records", status: r.status, reason: "AWAITING_REVIEW",
          label: `AIE ${r.aieNo ?? ""}`.trim(),
          amount: r.totalAmount != null ? Number(r.totalAmount) : null,
          created_at: r.createdAt ?? "", href: `/aie?focus=${r.id}`,
        }));
        inflows.forEach(r => all.push({
          id: r.id, table: "fund_inflows", status: r.status, reason: "AWAITING_REVIEW",
          label: `Inflow ${r.referenceNo ?? ""}`.trim(),
          amount: r.amount != null ? Number(r.amount) : null,
          created_at: r.createdAt ?? "", href: `/fund-inflows?focus=${r.id}`,
        }));
        exps.forEach(r => all.push({
          id: r.id, table: "expenditures", status: r.status, reason: "AWAITING_REVIEW",
          label: `Expenditure ${r.voucherNo ?? ""}`.trim(),
          amount: r.grossAmount != null ? Number(r.grossAmount) : null,
          created_at: r.createdAt ?? "", href: `/expenditures?focus=${r.id}`,
        }));
      }

      if (isDir) {
        const [aies, inflows, exps] = await Promise.all([
          listAies({ status: "PENDING_APPROVAL" }),
          listFundInflows({ status: "PENDING_APPROVAL" }),
          listExpenditures({ status: "OFFICER_REVIEWED" }),
        ]);
        aies.forEach(r => all.push({
          id: r.id, table: "aie_records", status: r.status, reason: "AWAITING_APPROVAL",
          label: `AIE ${r.aieNo ?? ""}`.trim(),
          amount: r.totalAmount != null ? Number(r.totalAmount) : null,
          created_at: r.createdAt ?? "", href: `/aie?focus=${r.id}`,
        }));
        inflows.forEach(r => all.push({
          id: r.id, table: "fund_inflows", status: r.status, reason: "AWAITING_APPROVAL",
          label: `Inflow ${r.referenceNo ?? ""}`.trim(),
          amount: r.amount != null ? Number(r.amount) : null,
          created_at: r.createdAt ?? "", href: `/fund-inflows?focus=${r.id}`,
        }));
        exps.forEach(r => all.push({
          id: r.id, table: "expenditures", status: r.status, reason: "AWAITING_APPROVAL",
          label: `Expenditure ${r.voucherNo ?? ""}`.trim(),
          amount: r.grossAmount != null ? Number(r.grossAmount) : null,
          created_at: r.createdAt ?? "", href: `/expenditures?focus=${r.id}`,
        }));
      }

      if (isClk) {
        const [aies, inflows, exps] = await Promise.all([
          listAies({ status: "REJECTED" }),
          listFundInflows({ status: "REJECTED" }),
          listExpenditures({ status: "RETURNED" }),
        ]);
        aies.forEach(r => all.push({
          id: r.id, table: "aie_records", status: r.status, reason: "RETURNED_TO_ME",
          label: `AIE ${r.aieNo ?? ""}`.trim(),
          amount: r.totalAmount != null ? Number(r.totalAmount) : null,
          created_at: r.createdAt ?? "", href: `/aie?focus=${r.id}`,
        }));
        inflows.forEach(r => all.push({
          id: r.id, table: "fund_inflows", status: r.status, reason: "RETURNED_TO_ME",
          label: `Inflow ${r.referenceNo ?? ""}`.trim(),
          amount: r.amount != null ? Number(r.amount) : null,
          created_at: r.createdAt ?? "", href: `/fund-inflows?focus=${r.id}`,
        }));
        exps.forEach(r => all.push({
          id: r.id, table: "expenditures", status: r.status, reason: "RETURNED_TO_ME",
          label: `Expenditure ${r.voucherNo ?? ""}`.trim(),
          amount: r.grossAmount != null ? Number(r.grossAmount) : null,
          created_at: r.createdAt ?? "", href: `/expenditures?focus=${r.id}`,
        }));
      }
    } catch {
      // keep previous state on error
    }

    all.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    setItems(all);
    setLoading(false);
  }, [hasRole]);

  useEffect(() => {
    refresh();
    if (!pollMs) return;
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { items, loading, refresh };
}
