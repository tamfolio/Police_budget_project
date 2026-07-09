import { useEffect, useMemo, useState } from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { useNavigate } from "react-router-dom";
import { listAies } from "@/lib/aiesApi";
import { listFundInflows } from "@/lib/fundInflowsApi";
import { listExpenditures } from "@/lib/expendituresApi";
import { listDistributionPeriods, type DistributionZonePeriod } from "@/lib/distributionsApi";
import { Banknote, FileSignature, Receipt, Layers, LayoutDashboard, BarChart3, Timer, ShieldCheck, BookOpen, Users, Keyboard } from "lucide-react";

type Hit = { type: "aie" | "inflow" | "expenditure" | "distribution"; id: string; label: string; sub: string; to: string };

const NAV: { label: string; to: string; Icon: React.ComponentType<{ className?: string }>; shortcut?: string }[] = [
  { label: "Dashboard",       to: "/",                       Icon: LayoutDashboard, shortcut: "g h" },
  { label: "Fund Inflows",    to: "/fund-inflows",           Icon: Banknote,        shortcut: "g f" },
  { label: "AIE Records",     to: "/aie",                    Icon: FileSignature,   shortcut: "g a" },
  { label: "Distributions",   to: "/distributions",          Icon: Layers,          shortcut: "g d" },
  { label: "Expenditures",    to: "/expenditures",           Icon: Receipt,         shortcut: "g e" },
  { label: "Reports",         to: "/reports",                Icon: BarChart3,       shortcut: "g r" },
  { label: "Approval SLA",    to: "/reports/sla",            Icon: Timer,           shortcut: "g s" },
  { label: "Audit Trail",     to: "/audit-trail",            Icon: ShieldCheck      },
  { label: "Budget Codes",    to: "/reference/budget-codes", Icon: BookOpen         },
  { label: "Admin Users",     to: "/admin/users",            Icon: Users            },
];

export function CommandPalette({ open, onOpenChange, onShowShortcuts }: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onShowShortcuts: () => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { if (!open) { setQ(""); setHits([]); } }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = q.trim().toLowerCase();
    if (term.length < 2) { setHits([]); return; }

    let cancelled = false;
    setLoading(true);

    const handle = setTimeout(async () => {
      try {
        const [aies, inflows, exps, dists] = await Promise.all([
          listAies(),
          listFundInflows(),
          listExpenditures(),
          listDistributionPeriods<DistributionZonePeriod>("zone").catch(() => []),
        ]);

        if (cancelled) return;

        const out: Hit[] = [];

        aies
          .filter(r => (r.aieNo ?? "").toLowerCase().includes(term) || (r.recipientUnit ?? "").toLowerCase().includes(term))
          .slice(0, 8)
          .forEach(r => out.push({
            type: "aie", id: r.id,
            label: r.aieNo ?? r.id.slice(0, 8),
            sub: `${r.recipientUnit ?? ""} · FY ${r.fiscalYear}`,
            to: "/aie",
          }));

        inflows
          .filter(r => (r.referenceNo ?? "").toLowerCase().includes(term) || String(r.fiscalYear).includes(term))
          .slice(0, 8)
          .forEach(r => out.push({
            type: "inflow", id: r.id,
            label: r.referenceNo ?? r.id.slice(0, 8),
            sub: `${r.source} · FY ${r.fiscalYear}`,
            to: "/fund-inflows",
          }));

        exps
          .filter(r => (r.voucherNo ?? "").toLowerCase().includes(term) || (r.payee ?? "").toLowerCase().includes(term))
          .slice(0, 8)
          .forEach(r => out.push({
            type: "expenditure", id: r.id,
            label: r.voucherNo ?? r.id.slice(0, 8),
            sub: `${r.payee ?? ""} · FY ${r.fiscalYear}`,
            to: "/expenditures",
          }));

        dists
          .filter(r => r.id.toLowerCase().startsWith(term) || (r.label ?? "").toLowerCase().includes(term))
          .slice(0, 6)
          .forEach(r => out.push({
            type: "distribution", id: r.id,
            label: r.id.slice(0, 8),
            sub: `Distribution · ${r.label ?? ""}`,
            to: "/distributions",
          }));

        setHits(out);
      } catch {
        // leave hits empty on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);

    return () => { cancelled = true; clearTimeout(handle); };
  }, [q, open]);

  const groupedHits = useMemo(() => ({
    aie:          hits.filter(h => h.type === "aie"),
    inflow:       hits.filter(h => h.type === "inflow"),
    expenditure:  hits.filter(h => h.type === "expenditure"),
    distribution: hits.filter(h => h.type === "distribution"),
  }), [hits]);

  const go = (to: string, focus?: string) => {
    onOpenChange(false);
    navigate(focus ? `${to}?focus=${focus}` : to);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search AIE no, voucher, reference no, or jump to a page…"
        value={q}
        onValueChange={setQ}
      />
      <CommandList>
        {loading && <div className="px-3 py-2 text-[11px] text-muted-foreground">Searching…</div>}
        {!loading && q.trim().length >= 2 && hits.length === 0 && (
          <CommandEmpty>No results for "{q}".</CommandEmpty>
        )}

        {groupedHits.aie.length > 0 && (
          <CommandGroup heading="AIE Records">
            {groupedHits.aie.map(h => (
              <CommandItem key={h.id} value={`aie ${h.label} ${h.sub}`} onSelect={() => go(h.to, h.id)}>
                <FileSignature className="h-3.5 w-3.5 mr-2" />
                <span className="font-medium">{h.label}</span>
                <span className="ml-2 text-[11px] text-muted-foreground">{h.sub}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {groupedHits.inflow.length > 0 && (
          <CommandGroup heading="Fund Inflows">
            {groupedHits.inflow.map(h => (
              <CommandItem key={h.id} value={`inflow ${h.label} ${h.sub}`} onSelect={() => go(h.to, h.id)}>
                <Banknote className="h-3.5 w-3.5 mr-2" />
                <span className="font-medium">{h.label}</span>
                <span className="ml-2 text-[11px] text-muted-foreground">{h.sub}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {groupedHits.expenditure.length > 0 && (
          <CommandGroup heading="Expenditures">
            {groupedHits.expenditure.map(h => (
              <CommandItem key={h.id} value={`exp ${h.label} ${h.sub}`} onSelect={() => go(h.to, h.id)}>
                <Receipt className="h-3.5 w-3.5 mr-2" />
                <span className="font-medium">{h.label}</span>
                <span className="ml-2 text-[11px] text-muted-foreground">{h.sub}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {groupedHits.distribution.length > 0 && (
          <CommandGroup heading="Distributions">
            {groupedHits.distribution.map(h => (
              <CommandItem key={h.id} value={`dist ${h.label}`} onSelect={() => go(h.to, h.id)}>
                <Layers className="h-3.5 w-3.5 mr-2" />
                <span className="font-medium">{h.label}</span>
                <span className="ml-2 text-[11px] text-muted-foreground">{h.sub}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />
        <CommandGroup heading="Navigate">
          {NAV.map(n => (
            <CommandItem key={n.to} value={`go ${n.label}`} onSelect={() => go(n.to)}>
              <n.Icon className="h-3.5 w-3.5 mr-2" />{n.label}
              {n.shortcut && <span className="ml-auto text-[10px] text-muted-foreground tracking-widest">{n.shortcut}</span>}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Help">
          <CommandItem value="shortcuts" onSelect={() => { onOpenChange(false); onShowShortcuts(); }}>
            <Keyboard className="h-3.5 w-3.5 mr-2" />Keyboard shortcuts
            <span className="ml-auto text-[10px] text-muted-foreground tracking-widest">?</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
