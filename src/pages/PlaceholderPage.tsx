import { Construction } from "lucide-react";

export default function PlaceholderPage({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold font-serif">{title}</h1>
      <p className="text-[12px] text-muted-foreground mt-1">{blurb}</p>
      <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <Construction className="h-8 w-8 mx-auto text-muted-foreground/70" />
        <p className="mt-3 text-sm font-medium">Coming in Phase 2</p>
        <p className="text-[11px] text-muted-foreground mt-1">The Fund Inflow → AIE → Distribution → Expenditure lifecycle, with maker-checker approvals and document upload, lands in the next phase.</p>
      </div>
    </div>
  );
}