import { useEffect, useMemo, useState } from "react";
import { fmtInt } from "@/lib/reportUtils";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, ArrowRight } from "lucide-react";

type SlaRow = {
  record_type: string;
  id: string;
  status: string;
  fiscal_year: number | null;
  submitted_by: string | null;
  reviewed_by: string | null;
  approved_by: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  hours_to_review: number | null;
  hours_to_approve: number | null;
  hours_pending: number | null;
  created_at: string;
};

const KEY = "approval-sla-threshold";

const ROUTE: Record<string, string> = {
  aie_records: "/aie",
  fund_inflows: "/fund-inflows",
  distribution_batches: "/distributions",
  expenditures: "/expenditures",
};

const LABEL: Record<string, string> = {
  aie_records: "AIE",
  fund_inflows: "Fund Inflow",
  distribution_batches: "Distribution",
  expenditures: "Expenditure",
};

export default function ApprovalSlaPage() {
  const { hasRole, loading: authLoading } = useAuth();
  const allowed = hasRole("AUDITOR") || hasRole("BUDGET_DIR") || hasRole("SYSADMIN");

  const [rows, setRows] = useState<SlaRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [thresholdDays, setThresholdDays] = useState<number>(() => {
    const raw = localStorage.getItem(KEY);
    return raw ? Number(raw) || 3 : 3;
  });

  useEffect(() => { document.title = "Approval SLA – NPF BMS"; }, []);
  useEffect(() => { localStorage.setItem(KEY, String(thresholdDays)); }, [thresholdDays]);

  useEffect(() => {
    if (!allowed) return;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any).from("v_approval_sla").select("*").limit(2000);
      const list = (data ?? []) as SlaRow[];
      setRows(list);
      const ids = Array.from(new Set(
        list.flatMap(r => [r.submitted_by, r.reviewed_by, r.approved_by]).filter(Boolean) as string[]
      ));
      if (ids.length) {
        const { data: ps } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids);
        const map: Record<string, string> = {};
        (ps ?? []).forEach((p: any) => { map[p.user_id] = p.full_name || p.email || p.user_id.slice(0, 8); });
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, [allowed]);

  const thresholdHours = thresholdDays * 24;

  const stale = useMemo(
    () => rows.filter(r =>
      (r.status === "SUBMITTED" || r.status === "OFFICER_REVIEWED") &&
      r.hours_pending != null && r.hours_pending > thresholdHours
    ).sort((a, b) => (b.hours_pending! - a.hours_pending!)),
    [rows, thresholdHours]
  );

  type ApproverAgg = { uid: string; reviewCount: number; reviewSum: number; approveCount: number; approveSum: number };
  const perApprover = useMemo(() => {
    const map = new Map<string, ApproverAgg>();
    const ensure = (uid: string) => {
      if (!map.has(uid)) map.set(uid, { uid, reviewCount: 0, reviewSum: 0, approveCount: 0, approveSum: 0 });
      return map.get(uid)!;
    };
    rows.forEach(r => {
      if (r.reviewed_by && r.hours_to_review != null) {
        const a = ensure(r.reviewed_by); a.reviewCount++; a.reviewSum += r.hours_to_review;
      }
      if (r.approved_by && r.hours_to_approve != null) {
        const a = ensure(r.approved_by); a.approveCount++; a.approveSum += r.hours_to_approve;
      }
    });
    return Array.from(map.values()).sort((a, b) => (b.reviewCount + b.approveCount) - (a.reviewCount + a.approveCount));
  }, [rows]);

  if (authLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!allowed) return <Navigate to="/dashboard" replace />;

  const fmtHrs = (h: number | null) => h == null ? "—" : h < 24 ? `${h.toFixed(1)}h` : `${(h / 24).toFixed(1)}d`;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold font-serif">Approval SLA</h1>
        <p className="text-[12px] text-muted-foreground mt-1">
          Average time approvers spend in each workflow step, and a list of items that have stalled past the threshold.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold font-serif">Per-approver averages</h2>
          <span className="text-[11px] text-muted-foreground ml-auto">{loading ? "Loading…" : `${perApprover.length} approver(s)`}</span>
        </div>
        {perApprover.length === 0 && !loading ? (
          <p className="text-[12px] text-muted-foreground italic">No reviews or approvals recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left p-2 w-10">S/N</th>
                  <th className="text-left p-2">Approver</th>
                  <th className="text-right p-2">Reviews</th>
                  <th className="text-right p-2">Avg time to review</th>
                  <th className="text-right p-2">Approvals</th>
                  <th className="text-right p-2">Avg time to approve</th>
                </tr>
              </thead>
              <tbody>
                {perApprover.map((a, _i) => (
                  <tr key={a.uid} className="border-t border-border">
                    <td className="p-2 text-xs text-muted-foreground tabular-nums">{_i + 1}</td>
                    <td className="p-2">{profiles[a.uid] ?? a.uid.slice(0, 8)}</td>
                    <td className="p-2 text-right font-mono">{fmtInt(a.reviewCount)}</td>
                    <td className="p-2 text-right font-mono">{fmtHrs(a.reviewCount ? a.reviewSum / a.reviewCount : null)}</td>
                    <td className="p-2 text-right font-mono">{fmtInt(a.approveCount)}</td>
                    <td className="p-2 text-right font-mono">{fmtHrs(a.approveCount ? a.approveSum / a.approveCount : null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h2 className="text-sm font-bold font-serif">Stale items</h2>
          <Badge variant="destructive" className="ml-2">{stale.length}</Badge>
          <div className="ml-auto flex items-center gap-3 min-w-[280px]">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">Threshold: <b className="text-foreground">{thresholdDays} day(s)</b></span>
            <Slider
              value={[thresholdDays]} min={1} max={14} step={1}
              onValueChange={v => setThresholdDays(v[0] ?? 3)}
              className="w-[160px]"
            />
          </div>
        </div>
        {stale.length === 0 ? (
          <p className="text-[12px] text-muted-foreground italic">Nothing past the threshold.</p>
        ) : (
          <ul className="divide-y divide-border">
            {stale.slice(0, 50).map(r => (
              <li key={`${r.record_type}-${r.id}`} className="py-2 flex items-center gap-3 text-[12px]">
                <div className="w-24 shrink-0"><Badge variant="outline">{LABEL[r.record_type] ?? r.record_type}</Badge></div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[11px] truncate">{r.id.slice(0, 8)}…</p>
                  <p className="text-[10px] text-muted-foreground">
                    Status {r.status} · pending {fmtHrs(r.hours_pending)} · FY {r.fiscal_year ?? "—"}
                  </p>
                </div>
                <Link to={`${ROUTE[r.record_type] ?? "/"}?focus=${r.id}`}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                  Open <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}