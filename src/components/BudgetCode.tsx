import { resolveBudgetCode } from "@/lib/budgetCodes";
import { cn } from "@/lib/utils";

/**
 * Renders a budget code in its canonical full 8-digit GIFMIS form.
 * Codes that aren't in the authoritative mapping are highlighted with a
 * yellow background so reviewers can spot them.
 */
export function BudgetCode({
  code,
  className,
  title,
}: {
  code: string | null | undefined;
  className?: string;
  title?: string;
}) {
  const r = resolveBudgetCode(code);
  if (!r.full) return <span className={className}>—</span>;
  return (
    <span
      className={cn(
        "font-mono",
        !r.isMapped && "bg-yellow-200 text-yellow-900 px-1 rounded",
        className,
      )}
      title={title ?? (r.isMapped ? r.name : `Unmapped short code — auto-prefixed with 2202. Review against GIFMIS chart.`)}
    >
      {r.full}
    </span>
  );
}