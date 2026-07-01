import {
  LayoutDashboard, Banknote, FileSignature, Layers, Receipt,
  ClipboardList, BarChart3, ShieldCheck, Users, LogOut, BookOpen, UserPlus,
  GitCompare,
  Database, Building2, Shield, KeyRound,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import npfLogo from "@/assets/npf-logo.png";
import { ROLE_LABEL } from "@/lib/roles";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Fund Inflows", url: "/fund-inflows", icon: Banknote },
  { title: "AIE Records", url: "/aie", icon: FileSignature },
  { title: "Distributions", url: "/distributions", icon: Layers },
  { title: "Expenditures", url: "/expenditures", icon: Receipt },
  { title: "Capital Budget", url: "/capital-budget", icon: Building2 },
  { title: "Proposals", url: "/proposals", icon: ClipboardList },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Comparisons", url: "/reports/compare", icon: GitCompare },
  { title: "Audit Trail", url: "/audit-trail", icon: ShieldCheck },
  { title: "Budget Codes", url: "/reference/budget-codes", icon: BookOpen },
  { title: "Admin", url: "/admin/users", icon: Users },
  { title: "Roles", url: "/admin/roles", icon: Shield },
  { title: "Permissions", url: "/admin/permissions", icon: KeyRound },
  { title: "Invite Users", url: "/admin/invite", icon: UserPlus },
  { title: "Repository", url: "/admin/backup", icon: Database },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, roles, signOut } = useAuth();
  const isActive = (path: string) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-primary text-primary-foreground">
        {!collapsed && (
          <div className="px-4 py-5 border-b border-sidebar-border">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-md bg-primary-foreground/95 flex items-center justify-center shrink-0 p-1">
                <img src={npfLogo} alt="NPF coat of arms" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] leading-tight font-bold font-serif text-primary-foreground">Nigeria Police Force</p>
                <p className="text-[10px] leading-tight text-sidebar-foreground/70 font-serif">Budget & Accounting Digital System</p>
              </div>
            </div>
          </div>
        )}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-md transition-colors"
                      activeClassName="bg-accent/12 text-accent border-l-[3px] border-accent font-medium"
                    >
                      <item.icon className="mr-2.5 h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-[13px] font-sans">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {!collapsed && (
          <div className="mt-auto px-4 py-3 border-t border-sidebar-border space-y-2">
            {user && (
              <div>
                <p className="text-[11px] text-primary-foreground font-medium truncate">{user.email}</p>
                <p className="text-[10px] text-sidebar-foreground/60 truncate">
                  {roles.length ? roles.map(r => ROLE_LABEL[r]).join(", ") : "No role assigned"}
                </p>
              </div>
            )}
            <button onClick={() => signOut()} className="flex items-center gap-1.5 text-[11px] text-sidebar-foreground/80 hover:text-accent">
              <LogOut className="h-3 w-3" /> Sign out
            </button>
            <p className="text-[10px] text-sidebar-foreground/40 font-sans">BMS v1.0 · {new Date().getFullYear()}</p>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
