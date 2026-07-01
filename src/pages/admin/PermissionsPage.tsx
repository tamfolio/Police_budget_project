import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2, Plus, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/apiClient";
import { createPermission, listPermissions, type ApiPermission } from "@/lib/rolesApi";

interface Editor {
  open: boolean;
  code: string;
  name: string;
  saving: boolean;
}

const EMPTY_EDITOR: Editor = { open: false, code: "", name: "", saving: false };

export default function AdminPermissionsPage() {
  const { hasRole } = useAuth();
  const isSysAdmin = hasRole("SYSADMIN");

  const [items, setItems] = useState<ApiPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<Editor>(EMPTY_EDITOR);

  useEffect(() => { document.title = "Permissions – NPF BMS"; }, []);

  const fetchItems = async (q?: string) => {
    setLoading(true);
    try {
      const res = await listPermissions({ pageNumber: 1, pageSize: 200, search: q || undefined });
      setItems(res.permissions ?? []);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load permissions.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSysAdmin) return;
    fetchItems();
  }, [isSysAdmin]);

  useEffect(() => {
    if (!isSysAdmin) return;
    const t = setTimeout(() => fetchItems(search.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const sorted = useMemo(() => [...items].sort((a, b) => a.code.localeCompare(b.code)), [items]);

  // Group by the prefix before the first dot for readability.
  const grouped = useMemo(() => {
    const groups = new Map<string, ApiPermission[]>();
    for (const p of sorted) {
      const key = p.code.includes(".") ? p.code.split(".")[0] : "other";
      const list = groups.get(key) ?? [];
      list.push(p);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [sorted]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = editor.code.trim();
    const name = editor.name.trim();
    if (code.length < 2) { toast.error("Code must be at least 2 characters."); return; }
    if (!/^[a-z0-9._-]+$/i.test(code)) {
      toast.error("Code should use letters, numbers, dots, dashes, or underscores.");
      return;
    }
    if (name.length < 2) { toast.error("Name must be at least 2 characters."); return; }
    setEditor(p => ({ ...p, saving: true }));
    try {
      await createPermission({ code, name });
      toast.success("Permission created.");
      setEditor(EMPTY_EDITOR);
      fetchItems(search.trim());
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create permission.";
      toast.error(msg);
      setEditor(p => ({ ...p, saving: false }));
    }
  };

  if (!isSysAdmin) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold font-serif">Access restricted</h1>
        <p className="text-sm text-muted-foreground mt-1">Permission management is reserved for System Administrators.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold font-serif flex items-center gap-2"><KeyRound className="h-5 w-5" />Permissions</h1>
          <p className="text-[12px] text-muted-foreground">
            The catalogue of permissions that can be granted to roles. Permissions are referenced by code (e.g.
            <code className="mx-1">fund-inflows.review</code>) throughout the API.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fetchItems(search.trim())} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
          <Button type="button" size="sm" onClick={() => setEditor({ ...EMPTY_EDITOR, open: true })}>
            <Plus className="h-3.5 w-3.5 mr-1" />New permission
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by code or name…"
          className="pl-8 h-9"
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="px-4 py-10 text-center text-[12px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…
          </div>
        ) : sorted.length === 0 ? (
          <div className="px-4 py-10 text-center text-[12px] text-muted-foreground">No permissions found.</div>
        ) : (
          <div className="divide-y divide-border">
            {grouped.map(([group, perms]) => (
              <div key={group}>
                <div className="px-4 py-2 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>{group}</span>
                  <span className="font-normal normal-case">{perms.length}</span>
                </div>
                <ul className="divide-y divide-border">
                  {perms.map(p => (
                    <li key={p.id} className="grid grid-cols-[260px_1fr] gap-3 px-4 py-2 text-[12.5px] items-center">
                      <Badge variant="outline" className="font-mono text-[10.5px] justify-self-start">{p.code}</Badge>
                      <div>{p.name}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={editor.open} onOpenChange={(o) => { if (!o) setEditor(EMPTY_EDITOR); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New permission</DialogTitle>
            <DialogDescription>
              Define a permission code that policies and backend handlers can check. Codes typically follow the
              <code className="mx-1">module.action</code> pattern.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="perm-code">Code</Label>
              <Input
                id="perm-code"
                value={editor.code}
                onChange={e => setEditor(p => ({ ...p, code: e.target.value }))}
                placeholder="e.g. fund-inflows.approve"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="perm-name">Name</Label>
              <Input
                id="perm-name"
                value={editor.name}
                onChange={e => setEditor(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Approve fund inflows"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditor(EMPTY_EDITOR)} disabled={editor.saving}>
                <X className="h-3.5 w-3.5 mr-1" />Cancel
              </Button>
              <Button type="submit" disabled={editor.saving}>
                {editor.saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                Create permission
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}