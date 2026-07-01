import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ALL_ROLES, ROLE_LABEL } from "@/lib/roles";
import type { AppRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Clock, Shield, AlertTriangle, CheckCircle2, X, RefreshCw, Trash2, KeyRound, Users as UsersIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useFocusRow } from "@/hooks/useFocusRow";

type ProfileRow = { user_id: string; email: string | null; full_name: string | null; is_active: boolean };
type RoleRow = { id: string; user_id: string; role: AppRole; assigned_by: string | null; confirmed_at: string | null };
type AuthInfo = { id: string; last_sign_in_at: string | null; created_at: string };

const ROLE_ACTIVATION_HINTS: Partial<Record<AppRole, { title: string; body: string; pages: string[] }>> = {
  BUDGET_CLK: {
    title: "Budget Clerk activated",
    body: "This user can now enter data. After they sign out and back in, the gold ENTER DATA HERE forms will appear on:",
    pages: ["Fund Inflows", "AIE Records", "Distributions", "Expenditures", "Proposals"],
  },
  BUDGET_OFF: {
    title: "Senior Budget Officer activated",
    body: "This user can now review SUBMITTED records (return or forward) on:",
    pages: ["Fund Inflows", "AIE Records", "Distributions", "Expenditures", "Proposals"],
  },
  BUDGET_DIR: {
    title: "Budget Director activated",
    body: "This user can now approve OFFICER_REVIEWED records on:",
    pages: ["Fund Inflows", "AIE Records", "Distributions", "Expenditures", "Proposals"],
  },
  AUDITOR: {
    title: "Internal Auditor activated",
    body: "This user can now read the full audit trail and export logs on:",
    pages: ["Audit Trail", "Reports"],
  },
  REPORT_VIEWER: {
    title: "Report Viewer activated",
    body: "This user can now access read-only reports on:",
    pages: ["Reports", "Dashboard"],
  },
  SYSADMIN: {
    title: "System Administrator activated",
    body: "Dual-control is now in effect. This user can manage reference data and confirm role assignments proposed by other admins on:",
    pages: ["User Administration", "Budget Reference"],
  },
};

export default function AdminUsersPage() {
  const { user, hasRole } = useAuth();
  const isSysAdmin = hasRole("SYSADMIN");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [allRoles, setAllRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastConfirmed, setLastConfirmed] = useState<{ role: AppRole; email: string } | null>(null);
  const [authInfo, setAuthInfo] = useState<Record<string, AuthInfo>>({});
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState<AppRole>("BUDGET_CLK");
  useFocusRow([profiles.length, allRoles.length, loading]);

  // assign form
  const [targetUser, setTargetUser] = useState<string>("");
  const [targetRole, setTargetRole] = useState<AppRole>("BUDGET_CLK");

  useEffect(() => { document.title = "User Administration – NPF BMS"; }, []);

  const refresh = async () => {
    setLoading(true);
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("user_id,email,full_name,is_active").order("email"),
      supabase.from("user_roles").select("id,user_id,role,assigned_by,confirmed_at").order("created_at", { ascending: false }),
    ]);
    setProfiles(p.data ?? []);
    setAllRoles((r.data ?? []) as RoleRow[]);
    setLoading(false);
    // Fetch auth metadata (last sign-in) via privileged edge function
    try {
      const { data } = await supabase.functions.invoke("admin-list-users", { body: {} });
      if (Array.isArray((data as any)?.users)) {
        const m: Record<string, AuthInfo> = {};
        for (const u of (data as any).users) m[u.id] = u;
        setAuthInfo(m);
      }
    } catch { /* ignore */ }
  };
  useEffect(() => { refresh(); }, []);

  // Debounced refresh — collapses bursts of realtime events into a single fetch.
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const forceRefresh = useCallback(() => {
    if (debounceTimer.current) { clearTimeout(debounceTimer.current); debounceTimer.current = null; }
    return refresh();
  }, []);
  const debouncedRefresh = useCallback((delay = 300) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      refresh();
    }, delay);
  }, []);
  useEffect(() => () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); }, []);

  // Realtime: refresh checklist + tables whenever roles or profiles change
  useEffect(() => {
    const channel = supabase
      .channel("admin-users-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => debouncedRefresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => debouncedRefresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [debouncedRefresh]);

  if (!isSysAdmin) {
    return <div className="p-4"><h1 className="text-xl font-bold font-serif">Access restricted</h1><p className="text-sm text-muted-foreground mt-1">User administration is reserved for System Administrators.</p></div>;
  }

  const assign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser || !targetRole) return;
    const { error } = await supabase.from("user_roles").insert({
      user_id: targetUser, role: targetRole, assigned_by: user!.id,
    });
    if (error) toast.error(error.message);
    else { toast.success("Role assignment created. A second SYSADMIN must confirm it."); await refresh(); }
  };

  const confirmRole = async (row: RoleRow) => {
    if (row.assigned_by === user!.id && !bootstrapMode) {
      toast.error("A different System Administrator must confirm this role.");
      return;
    }
    const { error } = await supabase.from("user_roles").update({ confirmed_by: user!.id, confirmed_at: new Date().toISOString() }).eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      const hint = ROLE_ACTIVATION_HINTS[row.role];
      const targetEmail = profiles.find(p => p.user_id === row.user_id)?.email ?? "user";
      toast.success(hint ? hint.title : "Role confirmed.", {
        description: hint
          ? `${hint.body} ${hint.pages.join(", ")}. The user may need to sign out and back in.`
          : (bootstrapMode && row.assigned_by === user!.id
              ? "Self-confirmed in bootstrap mode."
              : undefined),
        duration: 8000,
      });
      setLastConfirmed({ role: row.role, email: targetEmail });
      refresh();
    }
  };

  const removeRole = async (row: RoleRow) => {
    if (!confirm(`Remove ${ROLE_LABEL[row.role]} from this user?`)) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", row.id);
    if (error) toast.error(error.message); else refresh();
  };

  const bulkAssign = async () => {
    if (bulkSelected.size === 0) { toast.error("Select at least one user."); return; }
    const inserts = Array.from(bulkSelected).map(uid => ({ user_id: uid, role: bulkRole, assigned_by: user!.id }));
    const { error } = await supabase.from("user_roles").insert(inserts);
    if (error) toast.error(error.message);
    else {
      toast.success(`Proposed ${ROLE_LABEL[bulkRole]} for ${bulkSelected.size} user(s). A second SYSADMIN must confirm each.`);
      setBulkSelected(new Set());
      refresh();
    }
  };

  const sendPasswordReset = async (p: ProfileRow) => {
    if (!p.email) return;
    if (!confirm(`Send a password-reset email to ${p.email}?`)) return;
    const { data, error } = await supabase.functions.invoke("admin-reset-password", {
      body: { email: p.email, redirect_to: `${window.location.origin}/auth` },
    });
    if (error) { toast.error(error.message); return; }
    if ((data as any)?.error) { toast.error((data as any).error); return; }
    toast.success(`Password-reset email sent to ${p.email}.`);
  };

  const toggleActive = async (p: ProfileRow) => {
    const { error } = await supabase.from("profiles").update({ is_active: !p.is_active }).eq("user_id", p.user_id);
    if (error) toast.error(error.message); else refresh();
  };

  const deleteUser = async (p: ProfileRow) => {
    if (p.user_id === user!.id) { toast.error("You cannot delete your own account."); return; }
    const ok = confirm(`PERMANENTLY DELETE ${p.email}?\n\nThis removes their sign-in account, profile and all role assignments. Records they created (inflows, AIEs, etc.) will remain but show their former user id. This cannot be undone.`);
    if (!ok) return;
    const { data, error } = await supabase.functions.invoke("admin-delete-user", { body: { user_id: p.user_id } });
    if (error) { toast.error(error.message); return; }
    if ((data as any)?.error) { toast.error((data as any).error); return; }
    toast.success(`Deleted ${p.email}.`);
    refresh();
  };

  const rolesByUser = (uid: string) => allRoles.filter(r => r.user_id === uid);

  const toggleBulk = (uid: string) => {
    setBulkSelected(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };
  const toggleBulkAll = () => {
    if (bulkSelected.size === profiles.length) setBulkSelected(new Set());
    else setBulkSelected(new Set(profiles.map(p => p.user_id)));
  };
  const fmtLast = (iso: string | null) => {
    if (!iso) return "Never";
    const d = new Date(iso);
    const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  // Bootstrap mode: if only one confirmed SYSADMIN exists, dual-control is impossible.
  // Allow self-confirmation in that case so the system can be set up.
  const confirmedSysadmins = allRoles.filter(r => r.role === "SYSADMIN" && r.confirmed_at).length;
  const bootstrapMode = confirmedSysadmins < 2;

  // Role status checklist: required minimums for a fully operational system.
  const REQUIRED_ROLES: { role: AppRole; min: number; why: string }[] = [
    { role: "SYSADMIN",      min: 2, why: "Enables dual-control for all future role confirmations." },
    { role: "BUDGET_CLK",    min: 1, why: "Enters Fund Inflows, AIE, Distributions, Expenditures, Proposals." },
    { role: "BUDGET_OFF",    min: 1, why: "Reviews SUBMITTED records before they reach the Director." },
    { role: "BUDGET_DIR",    min: 1, why: "Final approver for OFFICER_REVIEWED records." },
    { role: "AUDITOR",       min: 1, why: "Reads the audit trail and export logs." },
    { role: "REPORT_VIEWER", min: 0, why: "Optional — read-only access to reports and dashboard." },
  ];
  const roleCounts = (r: AppRole) => ({
    active:  allRoles.filter(x => x.role === r && x.confirmed_at).length,
    pending: allRoles.filter(x => x.role === r && !x.confirmed_at).length,
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold font-serif">User Administration</h1>
        <p className="text-[12px] text-muted-foreground">Create role assignments. A second System Administrator must confirm each role before it takes effect.</p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
          <p className="text-[12px] font-semibold">Role status checklist</p>
          <div className="flex items-center gap-3">
            <p className="text-[11px] text-muted-foreground hidden sm:block">Required minimums for a fully operational system</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => { await forceRefresh(); toast.success("Checklist refreshed."); }}
              disabled={loading}
              className="h-7 text-[11px] gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
        <ul className="divide-y divide-border">
          {REQUIRED_ROLES.map(({ role, min, why }) => {
            const { active, pending } = roleCounts(role);
            const ok = active >= min;
            const optional = min === 0;
            return (
              <li key={role} className="px-4 py-2.5 flex items-center gap-3 text-[12.5px]">
                <span className={`h-5 w-5 rounded-full grid place-items-center shrink-0 ${
                  optional ? "bg-muted text-muted-foreground" : ok ? "bg-green-600 text-white" : "bg-destructive/15 text-destructive"
                }`}>
                  {ok ? <Check className="h-3 w-3" /> : optional ? "—" : <AlertTriangle className="h-3 w-3" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{ROLE_LABEL[role]}</span>
                    <span className={`text-[11px] px-1.5 py-0.5 rounded ${
                      optional ? "bg-muted text-muted-foreground"
                      : ok ? "bg-green-100 text-green-900"
                      : "bg-destructive/10 text-destructive"
                    }`}>
                      {active}{min > 0 ? `/${min}` : ""} active
                    </span>
                    {pending > 0 && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-accent/20 text-accent-foreground inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />{pending} pending
                      </span>
                    )}
                    {optional && <span className="text-[11px] text-muted-foreground italic">optional</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{why}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {lastConfirmed && ROLE_ACTIVATION_HINTS[lastConfirmed.role] && (
        <div className="rounded-lg border-2 border-green-600/60 bg-green-50 p-3 flex gap-3 items-start">
          <CheckCircle2 className="h-5 w-5 text-green-700 mt-0.5 shrink-0" />
          <div className="text-[12px] leading-relaxed flex-1">
            <p className="font-bold text-green-900">
              {ROLE_ACTIVATION_HINTS[lastConfirmed.role]!.title} for {lastConfirmed.email}
            </p>
            <p className="text-green-900/80 mt-0.5">
              {ROLE_ACTIVATION_HINTS[lastConfirmed.role]!.body}{" "}
              {ROLE_ACTIVATION_HINTS[lastConfirmed.role]!.pages.map((p, i, a) => (
                <span key={p}>
                  <span className="font-semibold">{p}</span>{i < a.length - 1 ? ", " : ""}
                </span>
              ))}.
            </p>
            <p className="text-green-900/70 mt-1 text-[11px] italic">
              Tip: ask {lastConfirmed.email} to sign out and back in so their new permissions load. The gold “ENTER DATA HERE” forms will then be visible.
            </p>
          </div>
          <button onClick={() => setLastConfirmed(null)} className="text-green-900/60 hover:text-green-900" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {bootstrapMode && (
        <div className="rounded-lg border-2 border-accent/60 bg-accent/10 p-4 space-y-3">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="h-4 w-4 text-accent-foreground mt-0.5 shrink-0" />
            <div className="text-[12px] leading-relaxed">
              <p className="font-bold">Bootstrap mode active — only one System Administrator exists.</p>
              <p className="text-muted-foreground mt-0.5">
                Dual-control is temporarily relaxed so you can activate the first set of roles. Once a second SYSADMIN is confirmed, the two-person rule resumes automatically.
              </p>
            </div>
          </div>

          <div className="rounded-md bg-card border border-border p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-accent-foreground mb-2">Activation guide — follow in order</p>
            <ol className="list-decimal pl-5 space-y-1.5 text-[12px] leading-relaxed">
              <li><span className="font-semibold">Activate the pending Budget Clerk role.</span> In the Users table below, find the row with the gold <em>pending</em> badge and click <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted/30 font-semibold"><Check className="h-3 w-3" />Confirm</span>. The badge turns dark and the user can immediately start entering data on Fund Inflows, AIE, Distributions, Expenditures and Proposals.</li>
              <li><span className="font-semibold">(Recommended) Add a second System Administrator.</span> Ask the trusted deputy to visit the sign-in page and use <em>First-time Setup</em> once. Their account then appears in the <strong>User</strong> dropdown of the “Propose assignment” form above.</li>
              <li><span className="font-semibold">Propose SYSADMIN for the deputy.</span> Select their email, choose <em>System Administrator</em>, click <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-muted/30 font-semibold">Propose assignment</span>. A pending row appears under their name.</li>
              <li><span className="font-semibold">Self-confirm the deputy’s SYSADMIN</span> (still in bootstrap mode): click <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted/30 font-semibold"><Check className="h-3 w-3" />Confirm</span> on their pending row. This banner will disappear on next refresh.</li>
              <li><span className="font-semibold">Dual-control resumes.</span> From now on every new role assignment must be proposed by one SYSADMIN and confirmed by a <em>different</em> SYSADMIN — including any future Budget Clerk, Officer, Director, Auditor or Report Viewer roles.</li>
            </ol>
            <p className="text-[11px] text-muted-foreground mt-2">
              Note: while bootstrap mode is on, every self-confirmation is recorded in the audit trail with your user ID, the role granted, and the timestamp.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={assign} className="rounded-xl border border-border bg-card p-4 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div>
          <Label>User</Label>
          <Select value={targetUser} onValueChange={setTargetUser}>
            <SelectTrigger><SelectValue placeholder="Select user…" /></SelectTrigger>
            <SelectContent>
              {profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Role</Label>
          <Select value={targetRole} onValueChange={(v)=>setTargetRole(v as AppRole)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit">Propose assignment</Button>
      </form>

      {bulkSelected.size > 0 && (
        <div className="rounded-xl border-2 border-accent/60 bg-accent/10 p-3 flex items-center gap-3 flex-wrap">
          <UsersIcon className="h-4 w-4 text-accent-foreground" />
          <p className="text-[12px] font-semibold">{bulkSelected.size} user(s) selected for bulk role assignment</p>
          <div className="flex items-center gap-2 ml-auto">
            <Select value={bulkRole} onValueChange={(v) => setBulkRole(v as AppRole)}>
              <SelectTrigger className="h-8 w-[200px] text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>{ALL_ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
            </Select>
            <Button type="button" size="sm" onClick={bulkAssign}>Propose for all selected</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setBulkSelected(new Set())}>Clear</Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-muted/30">
          <p className="text-[12px] font-semibold">Users ({profiles.length})</p>
        </div>
        {loading ? <p className="p-4 text-sm text-muted-foreground">Loading…</p> :
          <table className="w-full text-[13px]">
            <thead className="text-[11px] uppercase text-muted-foreground bg-muted/20">
              <tr>
                <th className="text-left p-2 w-10">S/N</th>
                <th className="p-2 w-8">
                  <Checkbox
                    checked={profiles.length > 0 && bulkSelected.size === profiles.length}
                    onCheckedChange={toggleBulkAll}
                    aria-label="Select all users"
                  />
                </th>
                <th className="text-left p-2">Email</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Last sign-in</th>
                <th className="text-left p-2">Roles</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p, _rowIdx) => (
                <tr key={p.user_id} data-focus-id={p.user_id} className="border-t border-border align-top">
                  <td className="p-2 align-middle text-xs text-muted-foreground tabular-nums">{_rowIdx + 1}</td>
                  <td className="p-2 align-middle">
                    <Checkbox
                      checked={bulkSelected.has(p.user_id)}
                      onCheckedChange={() => toggleBulk(p.user_id)}
                      aria-label={`Select ${p.email}`}
                    />
                  </td>
                  <td className="p-2"><div className="font-medium">{p.email}</div><div className="text-[11px] text-muted-foreground">{p.full_name || "—"}</div></td>
                  <td className="p-2">{p.is_active ? <Badge variant="secondary">Active</Badge> : <Badge variant="destructive">Deactivated</Badge>}</td>
                  <td className="p-2 text-[12px] text-muted-foreground tabular-nums">{fmtLast(authInfo[p.user_id]?.last_sign_in_at ?? null)}</td>
                  <td className="p-2 space-y-1">
                    {rolesByUser(p.user_id).length === 0 && <span className="text-[11px] text-muted-foreground">No roles</span>}
                    {rolesByUser(p.user_id).map(r => (
                      <div key={r.id} data-focus-id={r.id} className="flex items-center gap-2">
                        <Badge variant={r.confirmed_at ? "default" : "outline"}>
                          <Shield className="h-3 w-3 mr-1" />{ROLE_LABEL[r.role]}
                        </Badge>
                        {!r.confirmed_at && (
                          <Button size="sm" variant="outline" onClick={() => confirmRole(r)} className="h-6 text-[11px]">
                            <Check className="h-3 w-3 mr-1" />Confirm
                          </Button>
                        )}
                        {!r.confirmed_at && <span className="text-[11px] text-muted-foreground inline-flex items-center"><Clock className="h-3 w-3 mr-1" />pending</span>}
                        <button onClick={() => removeRole(r)} className="text-[11px] text-destructive hover:underline">remove</button>
                      </div>
                    ))}
                  </td>
                  <td className="p-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {p.email && (
                        <Button size="sm" variant="ghost" onClick={() => sendPasswordReset(p)} className="text-[11px]" title="Send password-reset email">
                          <KeyRound className="h-3 w-3 mr-1" />Reset PW
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(p)} className="text-[11px]">
                        {p.is_active ? "Deactivate" : "Reactivate"}
                      </Button>
                      {p.user_id !== user!.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteUser(p)}
                          className="text-[11px] text-destructive hover:text-destructive"
                          title="Permanently delete user"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>}
      </div>

      <p className="text-[11px] text-muted-foreground">
        To add a new user: ask them to visit the sign-in page and use “First-time Setup” once. After their account exists you can assign them a role here (a second System Administrator must confirm). <span className="font-semibold">Deactivate</span> blocks sign-in but preserves history; <span className="font-semibold">Delete</span> permanently removes the account.
      </p>
    </div>
  );
}