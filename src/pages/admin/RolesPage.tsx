import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, RefreshCw, Search, Shield, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  createRole, deleteRole, getRole, listPermissions, listRoles, updateRole,
  type ApiPermission, type ApiRoleSummary,
} from "@/lib/rolesApi";
import { ApiError } from "@/lib/apiClient";

interface EditorState {
  open: boolean;
  mode: "create" | "edit";
  id?: string;
  name: string;
  description: string;
  permissionIds: Set<string>;
  saving: boolean;
}

const EMPTY_EDITOR: EditorState = {
  open: false, mode: "create", name: "", description: "",
  permissionIds: new Set<string>(), saving: false,
};

export default function AdminRolesPage() {
  const { hasRole } = useAuth();
  const isSysAdmin = hasRole("SYSADMIN");

  const [roles, setRoles] = useState<ApiRoleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [permissions, setPermissions] = useState<ApiPermission[]>([]);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);

  useEffect(() => { document.title = "Roles – NPF BMS"; }, []);

  const fetchRoles = async (q?: string) => {
    setLoading(true);
    try {
      const res = await listRoles({ pageNumber: 1, pageSize: 50, search: q || undefined });
      setRoles(res.roles ?? []);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load roles.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSysAdmin) return;
    fetchRoles();
    listPermissions().then(p => setPermissions(p.permissions ?? [])).catch(() => {});
  }, [isSysAdmin]);

  // Debounced search
  useEffect(() => {
    if (!isSysAdmin) return;
    const t = setTimeout(() => fetchRoles(search.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openCreate = () => setEditor({ ...EMPTY_EDITOR, open: true, mode: "create", permissionIds: new Set() });

  const openEdit = async (r: ApiRoleSummary) => {
    setEditor({ ...EMPTY_EDITOR, open: true, mode: "edit", id: r.id, name: r.name, description: r.description ?? "", permissionIds: new Set() });
    try {
      const detail = await getRole(r.id);
      setEditor(prev => prev.id === r.id ? {
        ...prev,
        name: detail.name,
        description: detail.description ?? "",
        permissionIds: new Set(detail.permissions.map(p => p.id)),
      } : prev);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load role.";
      toast.error(msg);
    }
  };

  const togglePerm = (id: string) => {
    setEditor(prev => {
      const next = new Set(prev.permissionIds);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { ...prev, permissionIds: next };
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor.name.trim()) { toast.error("Role name is required."); return; }
    setEditor(p => ({ ...p, saving: true }));
    try {
      const payload = {
        name: editor.name.trim(),
        description: editor.description.trim() || undefined,
        permissions: Array.from(editor.permissionIds),
      };
      if (editor.mode === "create") {
        await createRole(payload);
        toast.success("Role created.");
      } else if (editor.id) {
        await updateRole(editor.id, payload);
        toast.success("Role updated.");
      }
      setEditor(EMPTY_EDITOR);
      await fetchRoles(search.trim());
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to save role.";
      toast.error(msg);
      setEditor(p => ({ ...p, saving: false }));
    }
  };

  const remove = async (r: ApiRoleSummary) => {
    if (!confirm(`Delete role "${r.name}"? This cannot be undone.`)) return;
    try {
      await deleteRole(r.id);
      toast.success(`Deleted ${r.name}.`);
      fetchRoles(search.trim());
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to delete role.";
      toast.error(msg);
    }
  };

  const permsLoaded = permissions.length > 0;
  const sortedPerms = useMemo(() => [...permissions].sort((a, b) => a.code.localeCompare(b.code)), [permissions]);

  if (!isSysAdmin) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold font-serif">Access restricted</h1>
        <p className="text-sm text-muted-foreground mt-1">Role management is reserved for System Administrators.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold font-serif flex items-center gap-2"><Shield className="h-5 w-5" />Roles</h1>
          <p className="text-[12px] text-muted-foreground">Create and manage roles. Roles are assigned to users when inviting them.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fetchRoles(search.trim())} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />New role
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search roles…"
          className="pl-8 h-9"
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_1fr_120px] gap-3 px-4 py-2 border-b border-border bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div>Name</div><div>Code</div><div>Description</div><div className="text-right">Actions</div>
        </div>
        {loading ? (
          <div className="px-4 py-6 text-center text-[12px] text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…</div>
        ) : roles.length === 0 ? (
          <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">No roles found.</div>
        ) : (
          <ul className="divide-y divide-border">
            {roles.map(r => (
              <li key={r.id} className="grid grid-cols-[1fr_120px_1fr_120px] gap-3 px-4 py-2.5 text-[12.5px] items-center">
                <div className="font-semibold">{r.name}</div>
                <div><Badge variant="outline" className="font-mono text-[10.5px]">{r.code}</Badge></div>
                <div className="text-muted-foreground truncate">{r.description || "—"}</div>
                <div className="flex justify-end gap-1">
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(r)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => remove(r)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={editor.open} onOpenChange={(o) => { if (!o) setEditor(EMPTY_EDITOR); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editor.mode === "create" ? "Create role" : "Edit role"}</DialogTitle>
            <DialogDescription>
              {editor.mode === "create"
                ? "Define a new role and assign the permissions it should grant."
                : "Update the role name, description, or its assigned permissions."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="role-name">Name</Label>
              <Input
                id="role-name"
                value={editor.name}
                onChange={e => setEditor(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Budget Reviewer"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="role-desc">Description</Label>
              <Textarea
                id="role-desc"
                value={editor.description}
                onChange={e => setEditor(p => ({ ...p, description: e.target.value }))}
                placeholder="What is this role allowed to do?"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Permissions {editor.permissionIds.size > 0 && <span className="text-muted-foreground font-normal">({editor.permissionIds.size} selected)</span>}</Label>
              {!permsLoaded ? (
                <p className="text-[12px] text-muted-foreground border border-dashed border-border rounded-md p-3">
                  Permissions list is unavailable. You can still save the role; assign permissions later when the catalog endpoint is enabled.
                </p>
              ) : (
                <div className="border border-border rounded-md max-h-64 overflow-y-auto divide-y divide-border">
                  {sortedPerms.map(p => {
                    const checked = editor.permissionIds.has(p.id);
                    return (
                      <label key={p.id} className="flex items-start gap-2 px-3 py-2 text-[12.5px] hover:bg-muted/30 cursor-pointer">
                        <Checkbox checked={checked} onCheckedChange={() => togglePerm(p.id)} className="mt-0.5" />
                        <div className="min-w-0">
                          <div className="font-medium">{p.name}</div>
                          <code className="text-[11px] text-muted-foreground">{p.code}</code>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditor(EMPTY_EDITOR)} disabled={editor.saving}>
                <X className="h-3.5 w-3.5 mr-1" />Cancel
              </Button>
              <Button type="submit" disabled={editor.saving}>
                {editor.saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                {editor.mode === "create" ? "Create role" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}