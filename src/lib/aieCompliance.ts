import { getBudgetCodeReference } from "@/lib/budgetCodesApi";
import { listAies } from "@/lib/aiesApi";

export type ComplianceCheck = { key: string; label: string; ok: boolean; detail?: string };
export type ComplianceResult = { ok: boolean; checks: ComplianceCheck[] };

/**
 * Pre-submit compliance checklist for an AIE.
 * - Every line's sub_item_code exists in budget_sub_items.
 * - At least one supporting document is attached.
 * - Total of all non-DRAFT AIE amounts for the same FY (incl. this one) does not exceed the FY appropriation ceiling.
 */
export async function runAieCompliance(opts: {
  aieId: string;
  fiscalYear: number;
  amount: number;
  lineSubCodes: string[];
  docCount: number;
}): Promise<ComplianceResult> {
  const checks: ComplianceCheck[] = [];
  const uniq = Array.from(new Set(opts.lineSubCodes.filter(Boolean)));

  const [ref, aieData] = await Promise.all([
    getBudgetCodeReference(),
    listAies({ fiscalYear: opts.fiscalYear }),
  ]);

  // 1. Sub-item codes exist
  if (uniq.length === 0) {
    checks.push({ key: "subitems", label: "Budget lines present", ok: false, detail: "No line items on this AIE." });
  } else {
    const allCodes = new Set(ref.categories.flatMap(c => (c.subItems ?? []).map(s => s.code)));
    const missing = uniq.filter(c => !allCodes.has(c));
    checks.push({
      key: "subitems",
      label: "All budget lines exist in chart of accounts",
      ok: missing.length === 0,
      detail: missing.length ? `Unknown sub-code(s): ${missing.join(", ")}` : `${uniq.length} sub-item(s) validated.`,
    });
  }

  // 2. Supporting documents
  checks.push({
    key: "docs",
    label: "At least one supporting document attached",
    ok: opts.docCount > 0,
    detail: opts.docCount > 0 ? `${opts.docCount} attachment(s).` : "Upload receipts, warrants, or approval memos before submitting.",
  });

  // 3. Ceiling not exceeded for FY
  const fyRow = ref.fiscalYears.find(f => f.year === opts.fiscalYear);
  const ceiling = Number(fyRow?.revisedAmount || 0) > 0 ? Number(fyRow?.revisedAmount) : Number(fyRow?.appropriationActAmount || 0);
  if (!fyRow) {
    checks.push({ key: "ceiling", label: "Fiscal year ceiling check", ok: false, detail: `Fiscal year ${opts.fiscalYear} is not configured.` });
  } else if (fyRow.status === "CLOSED") {
    checks.push({ key: "ceiling", label: "Fiscal year is open", ok: false, detail: `FY ${opts.fiscalYear} is CLOSED (read-only archive).` });
  } else if (ceiling <= 0) {
    checks.push({ key: "ceiling", label: "Appropriation ceiling configured", ok: false, detail: `No appropriation amount set for FY ${opts.fiscalYear}.` });
  } else {
    const countableStatuses = new Set(["PENDING_REVIEW", "PENDING_APPROVAL", "APPROVED"]);
    const committed = aieData
      .filter(r => r.id !== opts.aieId && countableStatuses.has(r.status))
      .reduce((t, r) => t + Number(r.totalAmount || 0), 0);
    const after = committed + Number(opts.amount || 0);
    const ok = after <= ceiling;
    const pct = ceiling > 0 ? ((after / ceiling) * 100).toFixed(1) : "—";
    checks.push({
      key: "ceiling",
      label: "AIE total fits within FY appropriation ceiling",
      ok,
      detail: ok
        ? `After submit: ${pct}% of ceiling used (₦${after.toLocaleString()} of ₦${ceiling.toLocaleString()}).`
        : `Would exceed ceiling: ₦${after.toLocaleString()} vs ₦${ceiling.toLocaleString()} (${pct}%).`,
    });
  }

  return { ok: checks.every(c => c.ok), checks };
}
