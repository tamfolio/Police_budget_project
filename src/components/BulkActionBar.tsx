import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Action = "APPROVE" | "REVIEW" | "RETURN";

export function BulkActionBar({
  count, onApprove, onReview, onReturn, onClear, approveLabel = "Approve",
}: {
  count: number;
  onClear: () => void;
  /** Optional: omit any action that isn't available for this list / role. */
  onApprove?: () => Promise<{ ok: number; failed: number }>;
  onReview?: () => Promise<{ ok: number; failed: number }>;
  onReturn?: (remarks: string) => Promise<{ ok: number; failed: number }>;
  approveLabel?: string;
}) {
  const [busy, setBusy] = useState<Action | null>(null);
  const [showReturn, setShowReturn] = useState(false);
  const [remarks, setRemarks] = useState("");

  if (count === 0) return null;

  const run = async (kind: Action, fn: () => Promise<{ ok: number; failed: number }>) => {
    setBusy(kind);
    const res = await fn();
    setBusy(null);
    if (res.failed === 0) toast.success(`${res.ok} record(s) updated.`);
    else toast.warning(`${res.ok} updated, ${res.failed} failed.`);
    onClear();
  };

  return (
    <>
      <div className="sticky bottom-4 z-20 mt-4 flex items-center gap-3 rounded-xl border border-primary/40 bg-card shadow-lg px-4 py-2.5">
        <span className="text-[12px] font-semibold">{count} selected</span>
        <div className="flex-1" />
        {onReview && (
          <Button size="sm" variant="default" className="h-8 text-[11px]" disabled={!!busy}
            onClick={() => run("REVIEW", onReview)}>
            {busy === "REVIEW" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
            Mark Reviewed
          </Button>
        )}
        {onApprove && (
          <Button size="sm" variant="default" className="h-8 text-[11px]" disabled={!!busy}
            onClick={() => run("APPROVE", onApprove)}>
            {busy === "APPROVE" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
            {approveLabel}
          </Button>
        )}
        {onReturn && (
          <Button size="sm" variant="outline" className="h-8 text-[11px]" disabled={!!busy}
            onClick={() => { setRemarks(""); setShowReturn(true); }}>
            <X className="h-3 w-3 mr-1" />Return
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-8 text-[11px]" onClick={onClear} disabled={!!busy}>
          Clear
        </Button>
      </div>

      <Dialog open={showReturn} onOpenChange={setShowReturn}>
        <DialogContent>
          <DialogHeader><DialogTitle>Return {count} record(s)</DialogTitle></DialogHeader>
          <p className="text-[12px] text-muted-foreground">
            The same remarks will be applied to every selected record. Remarks are required.
          </p>
          <Textarea
            value={remarks} onChange={e => setRemarks(e.target.value)}
            placeholder="Why are these being returned?"
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturn(false)}>Cancel</Button>
            <Button
              disabled={!remarks.trim() || !!busy}
              onClick={async () => { if (onReturn) { setShowReturn(false); await run("RETURN", () => onReturn(remarks.trim())); } }}>
              {busy === "RETURN" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
              Return {count}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}