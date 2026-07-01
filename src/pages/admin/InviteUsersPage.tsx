import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Mail, Loader2 } from "lucide-react";
import { listRoles, type ApiRoleSummary } from "@/lib/rolesApi";
import { inviteUsers, type InviteUserInput } from "@/lib/usersApi";
import { ApiError } from "@/lib/apiClient";

type Row = InviteUserInput & { _key: string };

const blankRow = (): Row => ({ _key: crypto.randomUUID(), email: "", fullName: "", roleId: "" });

export default function InviteUsersPage() {
  const { hasRole } = useAuth();
  const isSysAdmin = hasRole("SYSADMIN");

  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [roles, setRoles] = useState<ApiRoleSummary[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { document.title = "Invite Users – NPF BMS"; }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await listRoles({ pageSize: 100, pageNumber: 1 });
        if (!cancelled) setRoles(res.roles);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Failed to load roles");
      } finally {
        if (!cancelled) setLoadingRoles(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!isSysAdmin) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold font-serif">Access restricted</h1>
        <p className="text-sm text-muted-foreground mt-1">Inviting users is reserved for System Administrators.</p>
      </div>
    );
  }

  const update = (key: string, patch: Partial<Row>) =>
    setRows(prev => prev.map(r => r._key === key ? { ...r, ...patch } : r));
  const remove = (key: string) =>
    setRows(prev => prev.length === 1 ? prev : prev.filter(r => r._key !== key));
  const add = () => setRows(prev => [...prev, blankRow()]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = rows
      .map(({ _key, ...r }) => ({ email: r.email.trim(), fullName: r.fullName.trim(), roleId: r.roleId }))
      .filter(r => r.email && r.fullName && r.roleId);
    if (!cleaned.length) {
      toast.error("Add at least one invitation with email, full name and role.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await inviteUsers(cleaned);
      toast.success(`Sent ${created.length} invitation${created.length === 1 ? "" : "s"}.`);
      setRows([blankRow()]);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send invitations");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold font-serif">Invite Users</h1>
        <p className="text-[12px] text-muted-foreground">
          Send invitations by email. Each invitee receives a sign-in link and is assigned the selected role on first login.
        </p>
      </div>

      <form onSubmit={submit} className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
          <p className="text-[12px] font-semibold">Invitations</p>
          <Button type="button" size="sm" variant="outline" onClick={add} className="h-7 text-[11px] gap-1">
            <Plus className="h-3 w-3" /> Add row
          </Button>
        </div>

        <div className="divide-y divide-border">
          {rows.map((r, idx) => (
            <div key={r._key} className="p-3 grid grid-cols-1 md:grid-cols-[1.4fr_1.2fr_1.2fr_auto] gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-[11px]" htmlFor={`email-${r._key}`}>Email</Label>
                <Input
                  id={`email-${r._key}`}
                  type="email"
                  required
                  placeholder="officer@example.com"
                  value={r.email}
                  onChange={e => update(r._key, { email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]" htmlFor={`name-${r._key}`}>Full name</Label>
                <Input
                  id={`name-${r._key}`}
                  required
                  placeholder="Ada Okafor"
                  value={r.fullName}
                  onChange={e => update(r._key, { fullName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Role</Label>
                <Select value={r.roleId} onValueChange={v => update(r._key, { roleId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingRoles ? "Loading roles…" : "Select role"} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name} <span className="text-muted-foreground">({role.code})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(r._key)}
                disabled={rows.length === 1}
                aria-label={`Remove invitation ${idx + 1}`}
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-end gap-2">
          <Button type="submit" disabled={submitting || loadingRoles} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Send invitations
          </Button>
        </div>
      </form>
    </div>
  );
}