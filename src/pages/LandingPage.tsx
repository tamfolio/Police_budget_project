import { Link } from "react-router-dom";
import { useEffect } from "react";
import {
  ArrowRight, Banknote, FileSignature, Layers, Receipt, BarChart3,
  CalendarClock, Timer, GitCompare, BookOpen, Database, ClipboardList,
  LogIn, ShieldCheck, Users, Boxes, MonitorSmartphone,
  Building2,
} from "lucide-react";
import npfLogo from "@/assets/npf-logo.png";
import { useAuth } from "@/contexts/AuthContext";

const HEAD_FONT = { fontFamily: "'Libre Baskerville', Georgia, serif" } as const;
const BODY_FONT = { fontFamily: "'IBM Plex Sans', system-ui, sans-serif" } as const;

const accountBudgetModules = [
  { title: "Fund Inflows", desc: "Track Appropriation, Releases and Warrants from Federation to NPF.", icon: Banknote, to: "/fund-inflows" },
  { title: "AIE Records", desc: "Authority to Incur Expenditure issued to Commands.", icon: FileSignature, to: "/aie" },
  { title: "Distributions", desc: "Allocate AIE across zones, states and departments.", icon: Layers, to: "/distributions" },
  { title: "Expenditures", desc: "Commitments, payments and supporting evidence.", icon: Receipt, to: "/expenditures" },
  { title: "Capital Budget", desc: "2026 Appropriation Act capital projects for Police Affairs & Commands.", icon: Building2, to: "/capital-budget" },
  { title: "Carry-Over", desc: "Unspent balances rolled into the next fiscal cycle.", icon: CalendarClock, to: "/carry-over" },
  { title: "Proposals", desc: "Maker-checker workflow for budget proposals.", icon: ClipboardList, to: "/proposals" },
  { title: "Reports", desc: "Executive, legislature and audit-grade reporting.", icon: BarChart3, to: "/reports" },
  { title: "Approval SLA", desc: "Monitor turn-around times across the value chain.", icon: Timer, to: "/reports/sla" },
  { title: "Comparisons", desc: "FY-over-FY and budget-vs-actual variance.", icon: GitCompare, to: "/reports/compare" },
  { title: "Audit Trail", desc: "Tamper-evident log of every record and decision.", icon: ShieldCheck, to: "/audit-trail" },
  { title: "Budget Codes", desc: "Reference taxonomy aligned to GIFMIS chart of accounts.", icon: BookOpen, to: "/reference/budget-codes" },
  { title: "Repository", desc: "Backups, exports and archival snapshots.", icon: Database, to: "/admin/backup" },
];

const inventoryModules = [
  { title: "Asset Register", desc: "Track force-wide equipment, vehicles and facilities.", icon: Boxes },
  { title: "Procurement", desc: "Plan, approve and monitor capital and recurrent procurement.", icon: ClipboardList },
  { title: "Warehousing", desc: "Stock levels, movements and re-order thresholds.", icon: Boxes },
  { title: "Disposal", desc: "Board of survey, decommissioning and asset write-off.", icon: Receipt },
];

const digitalOfficeModules = [
  { title: "Memos & Correspondence", desc: "Internal memos, letters and dispatch tracking.", icon: FileSignature },
  { title: "File Tracking", desc: "Physical and electronic file movement registry.", icon: MonitorSmartphone },
  { title: "Meeting Minutes", desc: "Schedule, record and distribute management meeting minutes.", icon: Users },
  { title: "Notices", desc: "Force-wide circulars, policy alerts and announcements.", icon: BarChart3 },
];

function SectionHeader({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#1e3a5f]">{eyebrow}</p>
      <h2 className="mt-2 text-[34px] md:text-[40px] leading-tight" style={HEAD_FONT}>{title}</h2>
      <p className="mt-3 text-[14px] text-[#0A1628]/65">{desc}</p>
    </div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();

  useEffect(() => {
    document.title = "NPF Digital Operations Platform";
  }, []);

  const ctaTo = user ? "/dashboard" : "/auth";
  const ctaLabel = user ? "Open Dashboard" : "Sign in to continue";

  return (
    <div className="min-h-screen bg-[hsl(220,40%,97%)] text-[#0A1628]" style={BODY_FONT}>
      {/* Top bar */}
      <header className="sticky top-0 z-40 backdrop-blur bg-[#0A1628]/95 text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-white/95 p-1 flex items-center justify-center">
              <img src={npfLogo} alt="Nigeria Police Force coat of arms" className="w-full h-full object-contain" />
            </div>
            <div className="leading-tight">
              <p className="text-[12px] font-bold tracking-wide" style={HEAD_FONT}>Nigeria Police Force</p>
              <p className="text-[10px] text-white/60">Digital Operations Platform</p>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-[13px] text-white/80">
            <a href="#account" className="hover:text-[#C9A84C]">Account &amp; Budget</a>
            <a href="#inventory" className="hover:text-[#C9A84C]">Inventory</a>
            <a href="#office" className="hover:text-[#C9A84C]">Digital Office</a>
          </nav>
          <Link
            to={ctaTo}
            className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#d8b85e] text-[#0A1628] font-medium text-[13px] px-4 h-9 rounded-md transition-colors"
          >
            <LogIn className="h-4 w-4" /> {user ? "Dashboard" : "Sign in"}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0A1628] text-white">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 30%, #C9A84C 0, transparent 40%), radial-gradient(circle at 80% 70%, #1e3a5f 0, transparent 45%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-16">
          <div className="max-w-3xl">
            <h1
              className="text-[44px] md:text-[60px] leading-[1.05] tracking-tight"
              style={HEAD_FONT}
            >
              Three pillars. One platform. <span className="text-[#C9A84C]">Full control.</span>
            </h1>
            <p className="mt-6 text-[15px] md:text-[17px] text-white/70 max-w-2xl leading-relaxed">
              Account &amp; Budget, Inventory Management and Digital Office — unified on a single
              platform with maker-checker controls, audit-grade trails and role-based access for
              every command.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to={ctaTo}
                className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#d8b85e] text-[#0A1628] font-medium text-[14px] px-5 h-11 rounded-md transition-colors"
              >
                {ctaLabel} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Three module pillars */}
          <div className="mt-16 grid md:grid-cols-3 gap-5">
            <a
              href="#account"
              className="group rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#C9A84C]/40 p-6 transition-all"
            >
              <div className="w-10 h-10 rounded-md bg-[#C9A84C] text-[#0A1628] flex items-center justify-center">
                <Banknote className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-[16px] font-semibold" style={HEAD_FONT}>Account &amp; Budget</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/60">
                Fund inflows, AIE issuance, distributions, expenditures and audit.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#C9A84C]">
                Explore <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </a>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 opacity-70">
              <div className="w-10 h-10 rounded-md bg-white/20 text-[#C9A84C] flex items-center justify-center">
                <Boxes className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-[16px] font-semibold" style={HEAD_FONT}>Inventory Management</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/60">
                Asset register, procurement, warehousing and disposal.
              </p>
              <span className="mt-4 inline-block text-[11px] font-medium text-[#C9A84C] bg-[#C9A84C]/10 px-2 py-1 rounded">
                Coming soon
              </span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 opacity-70">
              <div className="w-10 h-10 rounded-md bg-white/20 text-[#C9A84C] flex items-center justify-center">
                <MonitorSmartphone className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-[16px] font-semibold" style={HEAD_FONT}>Digital Office</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/60">
                Memos, file tracking, meeting minutes and force-wide notices.
              </p>
              <span className="mt-4 inline-block text-[11px] font-medium text-[#C9A84C] bg-[#C9A84C]/10 px-2 py-1 rounded">
                Coming soon
              </span>
            </div>
          </div>

          <dl className="mt-16 grid grid-cols-3 gap-4 max-w-xl border-t border-white/10 pt-6">
            {[
              { k: "36+1", v: "States & FCT" },
              { k: "6", v: "Geo-political zones" },
              { k: "FY26", v: "Jan–Dec cycle" },
            ].map((s) => (
              <div key={s.v}>
                <dt className="text-[24px] text-[#C9A84C]" style={HEAD_FONT}>{s.k}</dt>
                <dd className="text-[10px] uppercase tracking-wider text-white/55 mt-1">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Section 1 — Account & Budget */}
      <section id="account" className="max-w-7xl mx-auto px-6 py-24">
        <SectionHeader
          eyebrow="Module 1"
          title="Account &amp; Budget"
          desc="The core financial engine — covering every link in the budget value chain from inflows to audit."
        />
        <div className="mt-12 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {accountBudgetModules.map((m) => (
            <Link
              key={m.title}
              to={user ? m.to : "/auth"}
              className="group rounded-xl border border-[#0A1628]/10 bg-white p-5 hover:border-[#C9A84C] hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-md bg-[#0A1628] text-[#C9A84C] flex items-center justify-center">
                <m.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-[16px] font-semibold text-[#0A1628]" style={HEAD_FONT}>{m.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#0A1628]/65">{m.desc}</p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#1e3a5f] group-hover:text-[#C9A84C]">
                Explore <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Section 2 — Inventory Management */}
      <section id="inventory" className="bg-white border-y border-[#0A1628]/10">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <SectionHeader
            eyebrow="Module 2"
            title="Inventory Management"
            desc="Plan, procure, store and dispose of force assets with full accountability."
          />
          <div className="mt-12 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {inventoryModules.map((m) => (
              <div
                key={m.title}
                className="rounded-xl border border-[#0A1628]/10 bg-[hsl(220,40%,97%)] p-5 opacity-70"
              >
                <div className="w-10 h-10 rounded-md bg-[#0A1628]/60 text-[#C9A84C] flex items-center justify-center">
                  <m.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-[16px] font-semibold text-[#0A1628]" style={HEAD_FONT}>{m.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#0A1628]/65">{m.desc}</p>
                <span className="mt-4 inline-block text-[11px] font-medium text-[#C9A84C] bg-[#C9A84C]/10 px-2 py-1 rounded">
                  Coming soon
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 — Digital Office */}
      <section id="office" className="max-w-7xl mx-auto px-6 py-24">
        <SectionHeader
          eyebrow="Module 3"
          title="Digital Office"
          desc="Paperless correspondence, file tracking and internal communications for the Force."
        />
        <div className="mt-12 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {digitalOfficeModules.map((m) => (
            <div
              key={m.title}
              className="rounded-xl border border-[#0A1628]/10 bg-white p-5 opacity-70"
            >
              <div className="w-10 h-10 rounded-md bg-[#0A1628]/60 text-[#C9A84C] flex items-center justify-center">
                <m.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-[16px] font-semibold text-[#0A1628]" style={HEAD_FONT}>{m.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#0A1628]/65">{m.desc}</p>
              <span className="mt-4 inline-block text-[11px] font-medium text-[#C9A84C] bg-[#C9A84C]/10 px-2 py-1 rounded">
                Coming soon
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0A1628] text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <h2 className="text-[30px] md:text-[36px] leading-tight" style={HEAD_FONT}>
              Ready to access the platform?
            </h2>
            <p className="mt-3 text-[14px] text-white/65 max-w-xl">
              Access is granted by the System Administrator based on your role and command.
            </p>
          </div>
          <Link
            to={ctaTo}
            className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#d8b85e] text-[#0A1628] font-medium text-[14px] px-6 h-11 rounded-md transition-colors self-start"
          >
            {ctaLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#06101d] text-white/60">
        <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-8 text-[12.5px]">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-white/95 p-1">
                <img src={npfLogo} alt="NPF" className="w-full h-full object-contain" />
              </div>
              <p className="text-white font-semibold" style={HEAD_FONT}>Nigeria Police Force</p>
            </div>
            <p className="mt-3 leading-relaxed">Digital Operations Platform. For official use by authorised personnel only.</p>
          </div>
          <div>
            <p className="text-white font-medium mb-3">Platform</p>
            <ul className="space-y-2">
              <li><a href="#account" className="hover:text-[#C9A84C]">Account &amp; Budget</a></li>
              <li><a href="#inventory" className="hover:text-[#C9A84C]">Inventory Management</a></li>
              <li><a href="#office" className="hover:text-[#C9A84C]">Digital Office</a></li>
            </ul>
          </div>
          <div>
            <p className="text-white font-medium mb-3">Resources</p>
            <ul className="space-y-2">
              <li><Link to="/help/videos" className="hover:text-[#C9A84C]">How-to videos</Link></li>
              <li><Link to="/help/manual" className="hover:text-[#C9A84C]">User manual</Link></li>
              <li><Link to="/help/glossary" className="hover:text-[#C9A84C]">Glossary</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5">
          <p className="max-w-7xl mx-auto px-6 py-5 text-[11px] text-white/40">
            © {new Date().getFullYear()} Nigeria Police Force. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}