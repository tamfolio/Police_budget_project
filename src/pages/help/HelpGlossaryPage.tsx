import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { HelpPageShell, HELP_HEAD_FONT } from "@/components/HelpPageShell";

const terms: { term: string; def: string }[] = [
  { term: "AIE", def: "Authority to Incur Expenditure — a formal authorisation issued to a beneficiary command permitting them to commit and spend a defined sum." },
  { term: "Appropriation", def: "The amount approved by the National Assembly for a specific MDA, vote or programme within a fiscal year." },
  { term: "Audit Trail", def: "Tamper-evident chronological record of every action taken in the system, attributed to a user and timestamp." },
  { term: "Budget Code", def: "Reference code identifying a vote, programme, sub-head or item, aligned to the GIFMIS chart of accounts." },
  { term: "Carry-over", def: "Unspent balance from a prior fiscal cycle that is permitted to roll into the next FY." },
  { term: "Command", def: "An operational unit of the NPF — typically a State Command, Zonal Command or department within Force Headquarters." },
  { term: "Commitment", def: "A formal undertaking (e.g. a purchase order) that earmarks part of an AIE against a future payment." },
  { term: "Distribution", def: "Allocation of an issued AIE across zones, states, departments or budget lines." },
  { term: "Executive", def: "Role representing the Presidency for oversight and high-level reporting access." },
  { term: "Expenditure", def: "A payment posted against an approved commitment and AIE, with supporting evidence." },
  { term: "FCT", def: "Federal Capital Territory, treated alongside the 36 states as a budget jurisdiction." },
  { term: "Fiscal Year (FY)", def: "The 12-month period for budgeting and accounting. From 2026 the NPF cycle runs January–December." },
  { term: "Fund Inflow", def: "Money received by NPF — Appropriations, Releases or Warrants from the Federation Account." },
  { term: "GIFMIS", def: "Government Integrated Financial Management Information System — the federal accounting platform." },
  { term: "Maker-Checker", def: "A two-person control where one user creates or modifies a record and a different user approves it." },
  { term: "Overhead Cost", def: "Recurrent non-personnel running costs of the Force, distinct from Personnel and Capital." },
  { term: "Release", def: "Disbursement from the Treasury against an approved appropriation, drawn down by warrants." },
  { term: "SLA", def: "Service-Level Agreement — the target turn-around time for approvals at each stage of the value chain." },
  { term: "Variance", def: "The difference between budgeted and actual figures, analysed by line, zone, state or period." },
  { term: "Warrant", def: "Treasury instrument that authorises drawing funds against a release." },
  { term: "Zone", def: "One of the six geo-political zones used to aggregate Command-level data." },
];

export default function HelpGlossaryPage() {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => terms.filter((t) => (t.term + " " + t.def).toLowerCase().includes(q.toLowerCase())),
    [q],
  );
  const grouped = useMemo(() => {
    const g: Record<string, typeof terms> = {};
    filtered.forEach((t) => {
      const k = t.term[0].toUpperCase();
      (g[k] ||= []).push(t);
    });
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <HelpPageShell
      eyebrow="Reference"
      title="Glossary of terms"
      intro="Definitions of the budgeting, accounting and oversight terms used across the platform."
    >
      <div className="relative max-w-md mb-12">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0A1628]/40" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search terms…"
          className="w-full h-11 pl-10 pr-4 rounded-md border border-[#0A1628]/15 bg-white text-[13.5px] focus:outline-none focus:border-[#C9A84C]"
        />
      </div>

      {grouped.length === 0 ? (
        <p className="text-[13px] text-[#0A1628]/60">No terms match “{q}”.</p>
      ) : (
        <div className="space-y-12">
          {grouped.map(([letter, items]) => (
            <section key={letter}>
              <h2 className="text-[22px] text-[#C9A84C] mb-5" style={HELP_HEAD_FONT}>{letter}</h2>
              <dl className="grid md:grid-cols-2 gap-x-10 gap-y-6">
                {items.map((t) => (
                  <div key={t.term} className="border-l-2 border-[#0A1628]/10 pl-4">
                    <dt className="text-[15px] font-semibold text-[#0A1628]" style={HELP_HEAD_FONT}>{t.term}</dt>
                    <dd className="mt-1.5 text-[13px] text-[#0A1628]/70 leading-relaxed">{t.def}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </HelpPageShell>
  );
}