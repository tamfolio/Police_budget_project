import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const ROWS: { keys: string[]; desc: string }[] = [
  { keys: ["⌘", "K"], desc: "Open command palette (also Ctrl+K)" },
  { keys: ["/"],     desc: "Open command palette / focus search" },
  { keys: ["?"],     desc: "Show this shortcuts list" },
  { keys: ["n"],     desc: "New record on the current page" },
  { keys: ["g", "h"], desc: "Go to Dashboard" },
  { keys: ["g", "a"], desc: "Go to AIE Records" },
  { keys: ["g", "f"], desc: "Go to Fund Inflows" },
  { keys: ["g", "d"], desc: "Go to Distributions" },
  { keys: ["g", "e"], desc: "Go to Expenditures" },
  { keys: ["g", "r"], desc: "Go to Reports" },
  { keys: ["g", "s"], desc: "Go to Approval SLA" },
  { keys: ["g", "c"], desc: "Go to Comparisons" },
  { keys: ["g", "u"], desc: "Go to User Administration" },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded border border-border bg-muted text-[11px] font-mono">
      {children}
    </kbd>
  );
}

export function ShortcutsHelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Keyboard shortcuts</DialogTitle>
          <DialogDescription>Speed up daily work. Shortcuts work when no input is focused (except ⌘K/Ctrl+K).</DialogDescription>
        </DialogHeader>
        <ul className="mt-2 divide-y divide-border text-[12.5px]">
          {ROWS.map((r, i) => (
            <li key={i} className="py-1.5 flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{r.desc}</span>
              <span className="flex items-center gap-1">{r.keys.map((k, j) => <Kbd key={j}>{k}</Kbd>)}</span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}