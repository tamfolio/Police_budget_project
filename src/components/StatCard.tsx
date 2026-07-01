import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  accent?: 'default' | 'success' | 'accent' | 'info' | 'destructive';
}

const accentColors: Record<string, string> = {
  default: 'text-foreground',
  success: 'text-success',
  accent: 'text-accent',
  info: 'text-info',
  destructive: 'text-destructive',
};

export function StatCard({ title, value, subtitle, accent = 'default' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-[18px]">
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground font-sans mb-2">{title}</p>
      <p className={cn("text-[22px] font-bold font-serif leading-tight", accentColors[accent])}>{value}</p>
      {subtitle && <p className="text-[11px] text-muted-foreground mt-1 font-sans">{subtitle}</p>}
    </div>
  );
}