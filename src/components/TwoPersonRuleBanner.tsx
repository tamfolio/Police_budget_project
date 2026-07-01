import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Surfaces why the current user cannot act on a transaction even though their role
 * would normally allow it (two-person rule: cannot review/approve what you created,
 * submitted, or previously reviewed).
 */
export function TwoPersonRuleBanner({
  record, expectedAction,
}: {
  record: {
    status: string;
    created_by: string;
    submitted_by?: string | null;
    reviewed_by?: string | null;
  };
  /** What the user is trying to do at this step. */
  expectedAction: "REVIEW" | "APPROVE";
}) {
  const { user, hasRole } = useAuth();
  if (!user) return null;

  const myId = user.id;
  const isOff = hasRole("BUDGET_OFF");
  const isDir = hasRole("BUDGET_DIR");

  const stage = expectedAction === "REVIEW" ? "SUBMITTED" : "OFFICER_REVIEWED";
  if (record.status !== stage) return null;

  // Only show if the user has the role but is the blocked party.
  const roleOk = expectedAction === "REVIEW" ? isOff : isDir;
  if (!roleOk) return null;

  const reasons: string[] = [];
  if (record.created_by === myId) reasons.push("you created this record");
  if (record.submitted_by && record.submitted_by === myId) reasons.push("you submitted it");
  if (expectedAction === "APPROVE" && record.reviewed_by && record.reviewed_by === myId)
    reasons.push("you reviewed it at the previous stage");

  if (reasons.length === 0) return null;

  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold">Two-person rule: you can't {expectedAction.toLowerCase()} this item.</p>
        <p className="opacity-90">Reason: {reasons.join("; ")}. A different authorised user must take this action.</p>
      </div>
    </div>
  );
}