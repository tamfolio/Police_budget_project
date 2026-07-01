import { useEffect, useState } from "react";
import { Check, X, Loader2, ShieldCheck } from "lucide-react";
import { runAieCompliance, type ComplianceResult } from "@/lib/aieCompliance";

export function AieComplianceChecklist({
  aieId, fiscalYear, amount, lineSubCodes, docCount, onResult,
}: {
  aieId: string;
  fiscalYear: number;
  amount: number;
  lineSubCodes: string[];
  docCount: number;
  onResult?: (r: ComplianceResult) => void;
}) {
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    runAieCompliance({ aieId, fiscalYear, amount, lineSubCodes, docCount })
      .then(r => { if (mounted) { setResult(r); onResult?.(r); } })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aieId, fiscalYear, amount, lineSubCodes.join("|"), docCount]);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        <span className="text-[12px] font-semibold">Pre-submit compliance</span>
        {result && (
          <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${result.ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
            {result.ok ? "Ready to submit" : `${result.checks.filter(c => !c.ok).length} blocker(s)`}
          </span>
        )}
      </div>
      <ul className="divide-y divide-border">
        {loading && (
          <li className="px-3 py-3 flex items-center gap-2 text-[11.5px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Running checks…
          </li>
        )}
        {result?.checks.map(c => (
          <li key={c.key} className="px-3 py-2 flex items-start gap-2 text-[11.5px]">
            {c.ok
              ? <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
              : <X className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />}
            <div className="min-w-0">
              <div className={c.ok ? "" : "font-medium"}>{c.label}</div>
              {c.detail && <div className="text-[10.5px] text-muted-foreground mt-0.5">{c.detail}</div>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}