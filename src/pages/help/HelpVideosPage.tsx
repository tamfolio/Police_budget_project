import { PlayCircle, Clock } from "lucide-react";
import { HelpPageShell, HELP_HEAD_FONT } from "@/components/HelpPageShell";

const videos = [
  { title: "Platform overview", duration: "4:12", desc: "A guided tour of the Budget & Accounting Digital System.", group: "Getting Started" },
  { title: "Signing in & two-factor", duration: "2:30", desc: "Authenticate securely and protect your account.", group: "Getting Started" },
  { title: "Recording a Fund Inflow", duration: "5:08", desc: "Post an Appropriation, Release or Warrant entry.", group: "Value Chain" },
  { title: "Issuing an AIE", duration: "6:15", desc: "Create an Authority to Incur Expenditure and route for approval.", group: "Value Chain" },
  { title: "Distributing AIE to Commands", duration: "4:45", desc: "Allocate to zones, states and departments.", group: "Value Chain" },
  { title: "Recording Expenditures", duration: "5:50", desc: "Capture commitments, payments and attach evidence.", group: "Value Chain" },
  { title: "Closing a Fiscal Year", duration: "7:02", desc: "Roll unspent balances into carry-over for the next FY.", group: "Year-end" },
  { title: "Generating audit reports", duration: "5:20", desc: "Build executive, legislature and audit-grade reports.", group: "Reporting" },
  { title: "Variance & comparisons", duration: "4:00", desc: "FY-over-FY and budget-vs-actual analysis.", group: "Reporting" },
];

const groups = Array.from(new Set(videos.map((v) => v.group)));

export default function HelpVideosPage() {
  return (
    <HelpPageShell
      eyebrow="Training library"
      title="How-to videos"
      intro="Short walkthroughs for every step of the budget value chain. Watch in any order — each lesson is self-contained."
    >
      <div className="space-y-14">
        {groups.map((g) => (
          <section key={g}>
            <h2 className="text-[20px] mb-5" style={HELP_HEAD_FONT}>{g}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {videos.filter((v) => v.group === g).map((v) => (
                <article key={v.title} className="rounded-xl border border-[#0A1628]/10 bg-white overflow-hidden hover:border-[#C9A84C] hover:shadow-[0_10px_30px_-14px_rgba(10,22,40,0.25)] transition-all cursor-pointer">
                  <div className="relative aspect-video bg-gradient-to-br from-[#0A1628] to-[#1e3a5f] flex items-center justify-center">
                    <PlayCircle className="h-12 w-12 text-[#C9A84C]" />
                    <span className="absolute bottom-2 right-2 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" /> {v.duration}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="text-[15px] font-semibold" style={HELP_HEAD_FONT}>{v.title}</h3>
                    <p className="mt-1.5 text-[12.5px] text-[#0A1628]/65 leading-relaxed">{v.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </HelpPageShell>
  );
}