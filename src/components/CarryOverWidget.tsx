import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { CalendarClock, ArrowRight } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmt = (n: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);

type P = { id: string; fiscal_year: number; period_month: number; residual: number; percent_utilized: number; status: string; total_inflows: number; total_expended: number; opening_balance: number };

export function CarryOverWidget({ fy }: { fy?: number | "ALL" }) {
  const [periods, setPeriods] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const yr = fy && fy !== "ALL" ? fy : new Date().getFullYear();
      const { data } = await supabase.from("carry_over_periods")
        .select("id,fiscal_year,period_month,residual,percent_utilized,status,total_inflows,total_expended,opening_balance")
        .eq("fiscal_year", yr).order("period_month", { ascending: false }).limit(3);
      setPeriods((data ?? []) as P[]);
      setLoading(false);
    })();
  }, [fy]);

  const latest = periods[0];

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-1.5"><CalendarClock className="h-4 w-4" /> Monthly Carry-Over</CardTitle>
        <Link to="/carry-over" className="text-[11px] text-primary hover:underline flex items-center gap-0.5">Open <ArrowRight className="h-3 w-3" /></Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? <p className="text-xs text-muted-foreground">Loading…</p> : !latest ? (
          <p className="text-xs text-muted-foreground">No carry-over period yet for this year.</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{MONTHS[latest.period_month-1]} {latest.fiscal_year}</p>
              <Badge variant={latest.status === "APPROVED" ? "default" : "secondary"}>{latest.status.replace(/_/g," ")}</Badge>
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-muted-foreground mb-0.5">
                <span>Utilised {Number(latest.percent_utilized||0).toFixed(1)}%</span>
                <span>Residual {fmt(Number(latest.residual||0))}</span>
              </div>
              <Progress value={Math.min(100, Number(latest.percent_utilized||0))} className="h-2" />
            </div>
            {periods.length > 1 && (
              <div className="space-y-1 pt-2 border-t">
                <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Recent months</p>
                {periods.slice(1).map(p => (
                  <div key={p.id} className="flex justify-between text-[11px]">
                    <span>{MONTHS[p.period_month-1]}</span>
                    <span className="text-muted-foreground">{Number(p.percent_utilized||0).toFixed(0)}% · {fmt(Number(p.residual||0))}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}