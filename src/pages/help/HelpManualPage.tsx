import { HelpPageShell, HELP_HEAD_FONT } from "@/components/HelpPageShell";
import { Download } from "lucide-react";

const sections = [
  {
    title: "1. Getting started",
    items: [
      "Roles & access levels (Admin, Executive, Legislature, Auditor, State Command, Public).",
      "Signing in with your official email and setting up two-factor authentication.",
      "Navigating the dashboard, global filters (FY, Zone, State) and shortcuts.",
    ],
  },
  {
    title: "2. Fund Inflows",
    items: [
      "Recording an Appropriation entry from the Federation Account.",
      "Posting a Release or Warrant against an existing appropriation.",
      "Reconciling inflows against the published budget.",
    ],
  },
  {
    title: "3. AIE & Distributions",
    items: [
      "Issuing an Authority to Incur Expenditure to a beneficiary command.",
      "Distributing AIE across zones, states, departments and budget lines.",
      "Maker-checker approval workflow and rejection handling.",
    ],
  },
  {
    title: "4. Expenditures",
    items: [
      "Raising a commitment against an approved AIE.",
      "Posting a payment, attaching invoices and supporting documents.",
      "Returns, refunds and reversal procedures.",
    ],
  },
  {
    title: "5. Carry-over & Year-end",
    items: [
      "Identifying unspent balances at the close of the fiscal cycle.",
      "Carrying balances into the next Jan–Dec fiscal year.",
      "Locking prior-year postings.",
    ],
  },
  {
    title: "6. Reporting & Oversight",
    items: [
      "Executive dashboard and KPI tiles.",
      "Generating legislature and audit-grade reports.",
      "Approval SLA, variance and budget-vs-actual comparisons.",
      "Reading the tamper-evident audit trail.",
    ],
  },
  {
    title: "7. Administration",
    items: [
      "Managing users, roles and command assignments.",
      "Backups, exports and archival snapshots.",
      "Configuring budget codes and reference data.",
    ],
  },
];

export default function HelpManualPage() {
  return (
    <HelpPageShell
      eyebrow="Documentation"
      title="Operating manual"
      intro="A step-by-step guide to operating the Budget & Accounting Digital System, organised around the federal budget value chain."
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-10 pb-6 border-b border-[#0A1628]/10">
        <p className="text-[13px] text-[#0A1628]/65">Version 1.0 · Force Headquarters, Budget Office</p>
        <button type="button" className="inline-flex items-center gap-2 text-[13px] font-medium text-[#0A1628] border border-[#0A1628]/15 hover:border-[#C9A84C] hover:text-[#0A1628] px-4 h-9 rounded-md transition-colors">
          <Download className="h-4 w-4" /> Download PDF
        </button>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-12">
        <nav className="hidden lg:block sticky top-24 self-start text-[12.5px] space-y-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#0A1628]/50 mb-3">Contents</p>
          {sections.map((s) => (
            <a key={s.title} href={`#${slug(s.title)}`} className="block text-[#0A1628]/70 hover:text-[#C9A84C]">{s.title}</a>
          ))}
        </nav>
        <article className="space-y-12">
          {sections.map((s) => (
            <section key={s.title} id={slug(s.title)}>
              <h2 className="text-[24px]" style={HELP_HEAD_FONT}>{s.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {s.items.map((it) => (
                  <li key={it} className="text-[13.5px] text-[#0A1628]/80 leading-relaxed pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[10px] before:w-2 before:h-2 before:bg-[#C9A84C] before:rounded-sm">
                    {it}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </article>
      </div>
    </HelpPageShell>
  );
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");