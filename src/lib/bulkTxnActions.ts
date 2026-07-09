import { reviewAie, approveAie, rejectAie } from "@/lib/aiesApi";
import { reviewFundInflow, approveFundInflow, rejectFundInflow } from "@/lib/fundInflowsApi";
import { reviewExpenditure, approveExpenditure, returnExpenditure } from "@/lib/expendituresApi";

export type BulkAction = "REVIEW" | "APPROVE" | "RETURN";
export type BulkTable = "aie_records" | "fund_inflows" | "distribution_batches" | "expenditures";

export async function runBulkTxnAction(opts: {
  table: BulkTable;
  ids: string[];
  action: BulkAction;
  actorId: string;
  remarks?: string;
}): Promise<{ ok: number; failed: number }> {
  const { table, ids, action, remarks } = opts;

  const run = (id: string): Promise<unknown> => {
    if (table === "aie_records") {
      if (action === "REVIEW")  return reviewAie(id);
      if (action === "APPROVE") return approveAie(id);
      return rejectAie(id, remarks ?? "Returned");
    }
    if (table === "fund_inflows") {
      if (action === "REVIEW")  return reviewFundInflow(id);
      if (action === "APPROVE") return approveFundInflow(id);
      return rejectFundInflow(id, remarks ?? "Returned");
    }
    if (table === "expenditures") {
      if (action === "REVIEW")  return reviewExpenditure(id);
      if (action === "APPROVE") return approveExpenditure(id);
      return returnExpenditure(id, remarks ?? "Returned");
    }
    return Promise.reject(new Error(`Bulk actions not supported for ${table}`));
  };

  const results = await Promise.allSettled(ids.map(run));
  let ok = 0, failed = 0;
  results.forEach(r => r.status === "fulfilled" ? ok++ : failed++);
  return { ok, failed };
}
