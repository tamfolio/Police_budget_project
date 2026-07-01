import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, RefreshCcw, Loader2, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/apiClient";
import {
  listHttpLogs, listAuditEntries,
  type AuditHttpLog, type AuditEntry, type AuditHttpMethod,
} from "@/lib/auditApi";

const fmtDt = (iso: string) => {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
};

const STATUS_VARIANT = (code: number): "default" | "secondary" | "destructive" | "outline" => {
  if (code >= 500) return "destructive";
  if (code >= 400) return "destructive";
  if (code >= 300) return "secondary";
  if (code >= 200) return "default";
  return "outline";
};

const ACTION_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  CREATE: "default", UPDATE: "secondary", DELETE: "destructive",
  SUBMIT: "default", REVIEW: "secondary", APPROVE: "default",
  REJECT: "destructive", RETURN: "destructive",
};

function apiErrorMessage(e: unknown, fallback: string) {
  if (e instanceof ApiError) return e.message || fallback;
  if (e instanceof Error) return e.message;
  return fallback;
}

const HTTP_METHODS: AuditHttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const PAGE_SIZE = 50;

export default function AuditTrailPage() {
  useEffect(() => { document.title = "Audit Trail – NPF BMS"; }, []);
  const { hasRole } = useAuth();
  const allowed = hasRole("AUDITOR") || hasRole("SYSADMIN") || hasRole("BUDGET_DIR");
  const [tab, setTab] = useState<"http" | "activity">("http");

  if (!allowed) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <ShieldCheck className="h-8 w-8 mx-auto text-muted-foreground" />
        <h1 className="mt-3 text-lg font-bold font-serif">Audit Trail</h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Restricted to Internal Auditors, System Administrators, and Budget Directors.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold font-serif">Audit Trail</h1>
        <p className="text-[12px] text-muted-foreground mt-1">
          HTTP requests and business activity recorded by the backend.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "http" | "activity")} className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="http">HTTP Requests</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="http" className="mt-4">
          <HttpLogsTab />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// HTTP Logs
// ============================================================
function HttpLogsTab() {
  const [rows, setRows] = useState<AuditHttpLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [method, setMethod] = useState<string>("ALL");
  const [endpoint, setEndpoint] = useState("");
  const [statusCode, setStatusCode] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detail, setDetail] = useState<AuditHttpLog | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { logs } = await listHttpLogs({
        method: method !== "ALL" ? (method as AuditHttpMethod) : undefined,
        endpoint: endpoint.trim() || undefined,
        statusCode: statusCode.trim() ? Number(statusCode) : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setRows(logs);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to load HTTP logs."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [method, endpoint, statusCode, dateFrom, dateTo, page]);

  useEffect(() => { refresh(); }, [refresh]);

  const applyFilters = () => { setPage(1); refresh(); };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <div>
            <Label className="text-[11px]">Method</Label>
            <Select value={method} onValueChange={(v) => { setMethod(v); setPage(1); }}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                {HTTP_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label className="text-[11px]">Endpoint contains</Label>
            <Input className="h-8 text-[12px]" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="/expenditures" />
          </div>
          <div>
            <Label className="text-[11px]">Status code</Label>
            <Input className="h-8 text-[12px]" value={statusCode} inputMode="numeric" onChange={(e) => setStatusCode(e.target.value)} placeholder="200" />
          </div>
          <div>
            <Label className="text-[11px]">From</Label>
            <Input type="date" className="h-8 text-[12px]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-[11px]">To</Label>
            <Input type="date" className="h-8 text-[12px]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" type="button" onClick={applyFilters} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />} Apply
          </Button>
          <div className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
            <Button size="sm" variant="ghost" type="button" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span>Page {page}</span>
            <Button size="sm" variant="ghost" type="button" disabled={rows.length < PAGE_SIZE || loading} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="rounded border border-border overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-2 py-1.5">When</th>
                <th className="text-left px-2 py-1.5">Method</th>
                <th className="text-left px-2 py-1.5">Endpoint</th>
                <th className="text-right px-2 py-1.5">Status</th>
                <th className="text-right px-2 py-1.5">Duration</th>
                <th className="text-left px-2 py-1.5">User</th>
                <th className="text-left px-2 py-1.5">IP</th>
                <th className="px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-2 py-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-2 py-6 text-center text-muted-foreground">No HTTP logs match the filters.</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="border-t border-border/60 hover:bg-muted/30">
                  <td className="px-2 py-1.5 whitespace-nowrap">{fmtDt(r.createdAt)}</td>
                  <td className="px-2 py-1.5"><Badge variant="outline" className="text-[10px]">{r.method}</Badge></td>
                  <td className="px-2 py-1.5 font-mono text-[11px]">{r.endpoint}</td>
                  <td className="px-2 py-1.5 text-right"><Badge variant={STATUS_VARIANT(r.statusCode)} className="text-[10px]">{r.statusCode}</Badge></td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.durationMs ?? "—"} ms</td>
                  <td className="px-2 py-1.5">{r.user?.fullName || r.user?.email || (r.user?.id ? r.user.id.slice(0, 8) : "—")}</td>
                  <td className="px-2 py-1.5 font-mono text-[10px]">{r.ipAddress ?? "—"}</td>
                  <td className="px-2 py-1.5 text-right">
                    <Button size="sm" variant="ghost" type="button" onClick={() => setDetail(r)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>HTTP Request</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-2 text-[12px]">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">When:</span> {fmtDt(detail.createdAt)}</div>
                <div><span className="text-muted-foreground">Status:</span> {detail.statusCode}</div>
                <div><span className="text-muted-foreground">Method:</span> {detail.method}</div>
                <div><span className="text-muted-foreground">Duration:</span> {detail.durationMs ?? "—"} ms</div>
                <div className="col-span-2"><span className="text-muted-foreground">Endpoint:</span> <span className="font-mono text-[11px]">{detail.endpoint}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">User:</span> {detail.user?.fullName || detail.user?.email || detail.user?.id || "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">IP:</span> {detail.ipAddress ?? "—"}</div>
                {detail.userAgent && (
                  <div className="col-span-2"><span className="text-muted-foreground">User-Agent:</span> <span className="font-mono text-[10px] break-all">{detail.userAgent}</span></div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============================================================
// Activity Log (business audit entries)
// ============================================================
function ActivityTab() {
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detail, setDetail] = useState<AuditEntry | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { entries } = await listAuditEntries({
        entityType: entityType.trim() || undefined,
        entityId: entityId.trim() || undefined,
        action: action.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setRows(entries);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to load activity log."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, action, dateFrom, dateTo, page]);

  useEffect(() => { refresh(); }, [refresh]);

  const applyFilters = () => { setPage(1); refresh(); };

  const changesPreview = useMemo(() => (e: AuditEntry) => {
    if (!e.changes || typeof e.changes !== "object") return "—";
    const keys = Object.keys(e.changes);
    if (keys.length === 0) return "—";
    return `${keys.length} field${keys.length === 1 ? "" : "s"} changed`;
  }, []);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <div>
            <Label className="text-[11px]">Entity type</Label>
            <Input className="h-8 text-[12px]" value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="BudgetProposal" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-[11px]">Entity ID</Label>
            <Input className="h-8 text-[12px] font-mono" value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="uuid" />
          </div>
          <div>
            <Label className="text-[11px]">Action</Label>
            <Input className="h-8 text-[12px]" value={action} onChange={(e) => setAction(e.target.value)} placeholder="APPROVE" />
          </div>
          <div>
            <Label className="text-[11px]">From</Label>
            <Input type="date" className="h-8 text-[12px]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-[11px]">To</Label>
            <Input type="date" className="h-8 text-[12px]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" type="button" onClick={applyFilters} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />} Apply
          </Button>
          <div className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
            <Button size="sm" variant="ghost" type="button" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span>Page {page}</span>
            <Button size="sm" variant="ghost" type="button" disabled={rows.length < PAGE_SIZE || loading} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="rounded border border-border overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-2 py-1.5">When</th>
                <th className="text-left px-2 py-1.5">Entity</th>
                <th className="text-left px-2 py-1.5">ID</th>
                <th className="text-left px-2 py-1.5">Action</th>
                <th className="text-left px-2 py-1.5">Performed by</th>
                <th className="text-left px-2 py-1.5">Changes</th>
                <th className="text-left px-2 py-1.5">Remarks</th>
                <th className="px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-2 py-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-2 py-6 text-center text-muted-foreground">No activity matches the filters.</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="border-t border-border/60 hover:bg-muted/30">
                  <td className="px-2 py-1.5 whitespace-nowrap">{fmtDt(r.createdAt)}</td>
                  <td className="px-2 py-1.5">{r.entityType}</td>
                  <td className="px-2 py-1.5 font-mono text-[10px]">{r.entityId?.slice(0, 12)}…</td>
                  <td className="px-2 py-1.5">
                    <Badge variant={ACTION_VARIANT[r.action] ?? "outline"} className="text-[10px]">{r.action}</Badge>
                  </td>
                  <td className="px-2 py-1.5">{r.performedBy?.fullName || r.performedBy?.email || "—"}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{changesPreview(r)}</td>
                  <td className="px-2 py-1.5 max-w-[280px] truncate" title={r.remarks ?? undefined}>{r.remarks ?? "—"}</td>
                  <td className="px-2 py-1.5 text-right">
                    <Button size="sm" variant="ghost" type="button" onClick={() => setDetail(r)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Activity Entry</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-[12px]">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">When:</span> {fmtDt(detail.createdAt)}</div>
                <div><span className="text-muted-foreground">Action:</span> {detail.action}</div>
                <div><span className="text-muted-foreground">Entity:</span> {detail.entityType}</div>
                <div><span className="text-muted-foreground">Entity ID:</span> <span className="font-mono text-[10px]">{detail.entityId}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">Performed by:</span> {detail.performedBy?.fullName || detail.performedBy?.email || detail.performedBy?.id || "—"}</div>
                {detail.remarks && <div className="col-span-2"><span className="text-muted-foreground">Remarks:</span> {detail.remarks}</div>}
              </div>
              {detail.changes && Object.keys(detail.changes).length > 0 && (
                <div>
                  <div className="text-[11px] text-muted-foreground mb-1">Changes</div>
                  <pre className="bg-muted/40 rounded p-2 text-[10.5px] font-mono overflow-x-auto max-h-80">{JSON.stringify(detail.changes, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}