import { Link } from "react-router-dom";
import { ArrowLeft, LogIn } from "lucide-react";
import { ReactNode } from "react";
import npfLogo from "@/assets/npf-logo.png";
import { useAuth } from "@/contexts/AuthContext";

const HEAD_FONT = { fontFamily: "'Libre Baskerville', Georgia, serif" } as const;
const BODY_FONT = { fontFamily: "'IBM Plex Sans', system-ui, sans-serif" } as const;

export function HelpPageShell({
  eyebrow, title, intro, children,
}: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-[hsl(220,40%,97%)] text-[#0A1628]" style={BODY_FONT}>
      <header className="sticky top-0 z-40 backdrop-blur bg-[#0A1628]/95 text-white border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-white/95 p-1 flex items-center justify-center">
              <img src={npfLogo} alt="NPF" className="w-full h-full object-contain" />
            </div>
            <div className="leading-tight">
              <p className="text-[12px] font-bold tracking-wide" style={HEAD_FONT}>Nigeria Police Force</p>
              <p className="text-[10px] text-white/60">Budget &amp; Accounting Digital System</p>
            </div>
          </Link>
          <Link to={user ? "/dashboard" : "/auth"} className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#d8b85e] text-[#0A1628] font-medium text-[13px] px-4 h-9 rounded-md transition-colors">
            <LogIn className="h-4 w-4" /> {user ? "Dashboard" : "Sign in"}
          </Link>
        </div>
      </header>

      <section className="bg-[#0A1628] text-white">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-14">
          <Link to="/" className="inline-flex items-center gap-1.5 text-[12px] text-white/60 hover:text-[#C9A84C]">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
          <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-[#C9A84C]">{eyebrow}</p>
          <h1 className="mt-3 text-[40px] md:text-[48px] leading-[1.05]" style={HEAD_FONT}>{title}</h1>
          <p className="mt-4 max-w-2xl text-[15px] text-white/70 leading-relaxed">{intro}</p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 py-16">{children}</main>

      <footer className="bg-[#06101d] text-white/50 text-[11px]">
        <p className="max-w-6xl mx-auto px-6 py-5">© {new Date().getFullYear()} Nigeria Police Force — Budget &amp; Accounting Digital System.</p>
      </footer>
    </div>
  );
}

export const HELP_HEAD_FONT = HEAD_FONT;