import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABEL } from "@/lib/roles";
import npfLogo from "@/assets/npf-logo.png";
import { PendingApprovalsBell } from "@/components/PendingApprovalsBell";
import { NotificationsBell } from "@/components/NotificationsBell";
import { Link } from "react-router-dom";
import { UserCircle2, Search } from "lucide-react";
import { useState } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { ShortcutsHelpDialog } from "@/components/ShortcutsHelpDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { useGlobalHotkeys } from "@/hooks/useGlobalHotkeys";

export function DashboardLayout() {
  const { user, roles } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  useGlobalHotkeys({
    onOpenPalette: () => setPaletteOpen(true),
    onShowShortcuts: () => setShortcutsOpen(true),
  });
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform);
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full app-shell">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border bg-card px-4 gap-3 shrink-0 sticky top-0 z-10 print:hidden">
            <SidebarTrigger />
            <div className="h-5 w-px bg-border" />
            <img src={npfLogo} alt="NPF" className="h-7 w-7 object-contain" />
            <div className="flex-1 text-[12px] text-muted-foreground truncate">
              Nigeria Police Force · Budget and Accounting Digital System · Overhead Cost
            </div>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden md:inline-flex items-center gap-2 h-8 px-2.5 rounded-md border border-border bg-muted/40 hover:bg-muted text-[11px] text-muted-foreground"
              title="Search anywhere (⌘K)"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search…</span>
              <kbd className="ml-1 inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded border border-border bg-background text-[10px] font-mono">
                {isMac ? "⌘K" : "Ctrl+K"}
              </kbd>
            </button>
            <LocaleSwitcher />
            <ThemeToggle />
            {user && (
              <div className="flex items-center gap-2">
                <PendingApprovalsBell />
                <NotificationsBell />
                <Link
                  to="/settings/profile"
                  className="flex items-center gap-1.5 px-2 h-8 rounded-md hover:bg-accent text-[11px] text-muted-foreground hover:text-foreground"
                  title="Profile & account settings"
                >
                  <UserCircle2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{user.email}</span>
                  <span className="hidden md:inline">·</span>
                  <span className="hidden md:inline text-foreground">{roles.map(r=>ROLE_LABEL[r]).join(", ") || "No role"}</span>
                </Link>
              </div>
            )}
          </header>
          <main className="flex-1 overflow-auto px-5 py-5 md:px-7 print-main">
            <Outlet />
          </main>
        </div>
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          onShowShortcuts={() => setShortcutsOpen(true)}
        />
        <ShortcutsHelpDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      </div>
    </SidebarProvider>
  );
}
