import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useDashboardFilters } from "@/contexts/DashboardFiltersContext";
import { RotateCcw, Filter } from "lucide-react";

const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function DashboardFiltersBar() {
  const { month, setMonth, reset } = useDashboardFilters();

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pr-2">
        <Filter className="h-3.5 w-3.5" /> Filters
      </div>

      <Select value={String(month)} onValueChange={(v) => setMonth(v === "ALL" ? "ALL" : Number(v))}>
        <SelectTrigger className="h-8 w-[180px] text-[12px]"><SelectValue placeholder="Month" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All months (FY 2026)</SelectItem>
          {MONTH_FULL.map((m, i) => (
            <SelectItem key={i} value={String(i + 1)}>{m} 2026</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button type="button" variant="ghost" size="sm" className="h-8 ml-auto text-[11px]" onClick={reset}>
        <RotateCcw className="h-3 w-3 mr-1" /> Reset
      </Button>
    </div>
  );
}