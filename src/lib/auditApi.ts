import { apiFetch } from "@/lib/apiClient";

/** Subset of HTTP methods the audit API records. */
export type AuditHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface AuditHttpLog {
  id: string;
  method: AuditHttpMethod;
  endpoint: string;
  statusCode: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  durationMs?: number;
  user?: { id: string; fullName?: string | null; email?: string | null } | null;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedBy?: { id: string; fullName?: string | null; email?: string | null } | null;
  changes?: Record<string, { old?: unknown; new?: unknown }> | null;
  remarks?: string | null;
  createdAt: string;
}

export interface Pagination {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface ListHttpLogsParams {
  userId?: string;
  method?: AuditHttpMethod;
  endpoint?: string;
  statusCode?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface ListAuditEntriesParams {
  entityType?: string;
  entityId?: string;
  action?: string;
  performedById?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function listHttpLogs(params: ListHttpLogsParams = {}) {
  const data = await apiFetch<{ logs?: AuditHttpLog[]; pagination?: Pagination }>(
    `/audit/logs${qs(params as Record<string, string | number | undefined>)}`,
  );
  return { logs: data?.logs ?? [], pagination: data?.pagination ?? {} };
}

export async function listAuditEntries(params: ListAuditEntriesParams = {}) {
  const data = await apiFetch<{ events?: AuditEntry[]; entries?: AuditEntry[]; pagination?: Pagination }>(
    `/audit/events${qs(params as Record<string, string | number | undefined>)}`,
  );
  return { entries: data?.events ?? data?.entries ?? [], pagination: data?.pagination ?? {} };
}