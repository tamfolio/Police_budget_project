import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABEL } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertTriangle, Check, Loader2, RefreshCw, Shield, UserCheck, UserX, Users as UsersIcon,
} from "lucide-react";
import {
  listAdminUsers, inviteUsers, activateUser, deactivateUser, type AdminUser,
} from "@/lib/usersApi";
import { listRoles, type ApiRoleSummary } from "@/lib/rolesApi";
import { ApiError } from "@/lib/apiClient";

type AppRole = string;

const REQUIRED_ROLES: { code: AppRole; label: string; min: number; why: string }[] = [
  { code: "SYSADMIN",      label: "System Administrator", min: 2, why: "Enables dual-control for all future role confirmations." },
  { code: "BUDGET_CLK",    label: "Budget Clerk",          min: 1, why: "Enters Fund Inflows, AIE, Distributions, Expenditures, Proposals." },
  { code: "BUDGET_OFF",    label: "Senior Budget Officer", min: 1, why: "Reviews SUBMITTED records before they reach the Director." },
  { code: "BUDGET_DIR",    label: "Budget Director",       min: 1, why: "Final approver for OFFICER_REVIEWED records." },
  { code: "AUDITOR",       label: "Internal Auditor",      min: 1, why: "Reads the audit trail and export logs." },
  { code: "REPORT_VIEWER", label: "Report Viewer",         min: 0, why: "Optional — read-only access to reports and dashboard." },
];

const fmtLast = (iso: string | null) => {
  if (!iso) return "Never";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
};

export default function AdminUsersPage() {
  const { user, hasRole } = useAuth();
  const isSysAdmin = hasRole("SYSADMIN");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<ApiRoleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [inviting, setInviting] = useState(false);

  // Toggling active state per user
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => { document.title = "User Administration – NPF BMS"; }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([
        listAdminUsers(),
        listRoles({ pageSize: 100 }),
      ]);
      setUsers(u);
      setRoles(r.roles);
      if (!inviteRoleId && r.roles.length > 0) setInviteRoleId(r.roles[0].id);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  if (!isSysAdmin) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold font-serif">Access restricted</h1>
        <p className="text-sm text-muted-foreground mt-1">
          User administration is reserved for System Administrators.
        </p>
      </div>
    );
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteFullName.trim() || !inviteRoleId) {
      toast.error("Email, full name and role are all required.");
      return;
    }
    setInviting(true);
    try {
      await inviteUsers([{ email: inviteEmail.trim(), fullName: inviteFullName.trim(), roleId: inviteRoleId }]);
      toast.success(`Invitation sent to ${inviteEmail.trim()}.`);
      setInviteEmail("");
      setInviteFullName("");
      refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Invite failed.");
    } finally {
      setInviting(false);
    }
  };

  const handleToggleActive = async (u: AdminUser) => {
    setToggling(u.id);
    try {
      if (u.isActive) {
        await deactivateUser(u.id);
        toast.success(`${u.fullName || u.email} deactivated.`);
      } else {
        await activateUser(u.id);
        toast.success(`${u.fullName || u.email} activated.`);
      }
      refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Action failed.");
    } finally {
      setToggling(null);
    }
  };

  const roleCounts = (code: string) =>
    users.filter(u => u.role?.code === code && u.isActive).length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold font-serif">User Administration</h1>
        <p className="text-[12px] text-muted-foreground">
          Invite users and manage their access. Use the invite form to add new users with a role.
        </p>
      </div>

      {/* Role checklist */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
          <p className="text-[12px] font-semibold">Role status checklist</p>
          <Button
            type="button" size="sm" variant="outline"
            onClick={async () => { await refresh(); toast.success("Refreshed."); }}
            disabled={loading} className="h-7 text-[11px] gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <ul className="divide-y divide-border">
          {REQUIRED_ROLES.map(({ code, label, min, why }) => {
            const active = roleCounts(code);
            const ok = active >= min;
            const optional = min === 0;
            return (
              <li key={code} className="px-4 py-2.5 flex items-center gap-3 text-[12.5px]">
                <span className={`h-5 w-5 rounded-full grid place-items-center shrink-0 ${
                  optional ? "bg-muted text-muted-foreground"
                  : ok ? "bg-green-600 text-white"
                  : "bg-destructive/15 text-destructive"
                }`}>
                  {ok ? <Check className="h-3 w-3" /> : optional ? "—" : <AlertTriangle className="h-3 w-3" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{label}</span>
                    <span className={`text-[11px] px-1.5 py-0.5 rounded ${
                      optional ? "bg-muted text-muted-foreground"
                      : ok ? "bg-green-100 text-green-900"
                      : "bg-destructive/10 text-destructive"
                    }`}>
                      {active}{min > 0 ? `/${min}` : ""} active
                    </span>
                    {optional && <span className="text-[11px] text-muted-foreground italic">optional</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{why}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Invite form */}
      <form onSubmit={handleInvite} className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-[12px] font-semibold">Invite new user</p>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
          <div>
            <Label className="text-[11px]">Email</Label>
            <Input
              type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder="user@example.com" className="h-9 text-[12px]" required
            />
          </div>
          <div>
            <Label className="text-[11px]">Full name</Label>
            <Input
              value={inviteFullName} onChange={e => setInviteFullName(e.target.value)}
              placeholder="John Doe" className="h-9 text-[12px]" required
            />
          </div>
          <div>
            <Label className="text-[11px]">Role</Label>
            <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
              <SelectTrigger className="h-9 text-[12px]">
                <SelectValue placeholder="Select role…" />
              </SelectTrigger>
              <SelectContent>
                {roles.map(r => (
                  <SelectItem key={r.id} value={r.id} className="text-[12px]">
                    {ROLE_LABEL[r.code as keyof typeof ROLE_LABEL] ?? r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={inviting} className="h-9">
            {inviting && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            Send invite
          </Button>
        </div>
      </form>

      {/* Users table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-muted/30">
          <p className="text-[12px] font-semibold">Users ({users.length})</p>
        </div>
        {loading ? (
          <div className="p-6 text-center text-[12px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…
          </div>
        ) : users.length === 0 ? (
          <p className="p-6 text-center text-[12px] text-muted-foreground">No users found.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="text-[11px] uppercase text-muted-foreground bg-muted/20">
              <tr>
                <th className="text-left p-2 w-8">#</th>
                <th className="text-left p-2">User</th>
                <th className="text-left p-2">Role</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Last login</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className="border-t border-border align-middle">
                  <td className="p-2 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="p-2">
                    <div className="font-medium">{u.email}</div>
                    <div className="text-[11px] text-muted-foreground">{u.fullName || "—"}</div>
                  </td>
                  <td className="p-2">
                    {u.role ? (
                      <Badge variant="secondary" className="text-[11px]">
                        <Shield className="h-3 w-3 mr-1" />
                        {ROLE_LABEL[u.role.code as keyof typeof ROLE_LABEL] ?? u.role.name}
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">No role</span>
                    )}
                  </td>
                  <td className="p-2">
                    {u.isActive
                      ? <Badge variant="secondary" className="text-[11px]">Active</Badge>
                      : <Badge variant="destructive" className="text-[11px]">Deactivated</Badge>}
                  </td>
                  <td className="p-2 text-[12px] text-muted-foreground tabular-nums">
                    {fmtLast(u.lastLogin)}
                  </td>
                  <td className="p-2 text-right">
                    {u.id !== user?.id && (
                      <Button
                        type="button" size="sm" variant="ghost"
                        className={`h-7 text-[11px] ${u.isActive ? "" : "text-green-700 hover:text-green-700"}`}
                        disabled={toggling === u.id}
                        onClick={() => handleToggleActive(u)}
                      >
                        {toggling === u.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : u.isActive
                            ? <><UserX className="h-3 w-3 mr-1" />Deactivate</>
                            : <><UserCheck className="h-3 w-3 mr-1" />Activate</>}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        <span className="font-semibold">Deactivate</span> blocks sign-in but preserves all history.
        To change a user's role, deactivate them and send a new invite with the updated role.
      </p>
    </div>
  );
}
