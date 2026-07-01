import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Inbox, ArrowRight } from "lucide-react";

type Step = { text: string; to?: string };

export function EmptyState({
  title, description, steps, icon, cta,
}: {
  title: string;
  description?: string;
  steps?: Step[];
  icon?: ReactNode;
  cta?: { label: string; to?: string; onClick?: () => void };
}) {
  return (
    <div className="p-8 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <h3 className="text-sm font-bold font-serif">{title}</h3>
      {description && <p className="text-[12px] text-muted-foreground mt-1 max-w-md mx-auto">{description}</p>}
      {steps && steps.length > 0 && (
        <ol className="mt-4 inline-block text-left text-[12px] space-y-1.5 max-w-md">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="h-4 w-4 rounded-full bg-accent/20 text-accent-foreground text-[10px] font-bold inline-flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              {s.to ? <Link to={s.to} className="text-primary hover:underline">{s.text}</Link> : <span>{s.text}</span>}
            </li>
          ))}
        </ol>
      )}
      {cta && (
        <div className="mt-4">
          {cta.to ? (
            <Link to={cta.to} className="inline-flex items-center gap-1 text-[12px] px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90">
              {cta.label} <ArrowRight className="h-3 w-3" />
            </Link>
          ) : (
            <button type="button" onClick={cta.onClick} className="inline-flex items-center gap-1 text-[12px] px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90">
              {cta.label} <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}