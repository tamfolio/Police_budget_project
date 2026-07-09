import { apiFetch, API_BASE_URL } from "@/lib/apiClient";
import { getAccessToken } from "@/lib/authStorage";

// ─── Response types ────────────────────────────────────────────────────────────

export interface PresignResponse {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresIn: number;
}

export interface UploadResponse {
  key: string;
  publicUrl: string;
}

export interface BulkUploadResponse {
  uploaded: number;
  results: UploadResponse[];
}

export interface DownloadResponse {
  downloadUrl: string;
  key: string;
  expiresIn: number;
}

export interface StorageMetadata {
  key: string;
  size: number;
  lastModified: string;
  contentType: string;
  etag: string;
}

export interface StorageExistsResponse {
  exists: boolean;
}

export interface StorageListResponse {
  objects: { key: string; publicUrl?: string }[];
  continuationToken?: string | null;
  isTruncated?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** multipart/form-data upload — cannot use apiFetch (which sets Content-Type: application/json). */
async function uploadFetch<T>(path: string, body: FormData): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { method: "POST", headers, body });
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const err = payload?.error ?? { code: `HTTP_${res.status}`, message: res.statusText };
    throw new Error(err.message ?? "Upload failed");
  }
  return (payload?.data ?? payload) as T;
}

// ─── API functions ─────────────────────────────────────────────────────────────

/**
 * Get a presigned URL to upload a file directly from the browser.
 * Use the returned `uploadUrl` to PUT the file, then store the `key` on your record.
 */
export async function presignUpload(
  fileName: string,
  contentType: string,
  folder = "uploads",
  expiresIn = 900,
): Promise<PresignResponse> {
  return apiFetch<PresignResponse>("/storage/presign", {
    method: "POST",
    body: { fileName, contentType, folder, expiresIn },
  });
}

/** Upload a single file via the server (multipart/form-data). */
export async function uploadFile(file: File, folder = "uploads"): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  if (folder) form.append("folder", folder);
  return uploadFetch<UploadResponse>("/storage/upload", form);
}

/** Upload up to 10 files at once via the server (multipart/form-data). */
export async function uploadFiles(files: File[], folder = "uploads"): Promise<BulkUploadResponse> {
  const form = new FormData();
  files.forEach(f => form.append("files", f));
  if (folder) form.append("folder", folder);
  return uploadFetch<BulkUploadResponse>("/storage/upload/bulk", form);
}

/** Get a short-lived download URL for a stored object. */
export async function getDownloadUrl(key: string): Promise<DownloadResponse> {
  return apiFetch<DownloadResponse>(`/storage/download/${encodeURIComponent(key)}`);
}

/** Get metadata for a stored object (size, content type, etc.). */
export async function getStorageMetadata(key: string): Promise<StorageMetadata> {
  return apiFetch<StorageMetadata>(`/storage/metadata/${encodeURIComponent(key)}`);
}

/** Check whether an object exists in storage. */
export async function checkStorageExists(key: string): Promise<boolean> {
  const res = await apiFetch<StorageExistsResponse>(`/storage/exists/${encodeURIComponent(key)}`);
  return res.exists ?? false;
}

/** List objects by key prefix. */
export async function listStorageObjects(
  prefix: string,
  maxKeys?: number,
  continuationToken?: string,
): Promise<StorageListResponse> {
  return apiFetch<StorageListResponse>(
    `/storage/list${qs({ prefix, maxKeys, continuationToken })}`,
  );
}

/** Delete multiple objects by key. */
export async function deleteStorageObjects(keys: string[]): Promise<void> {
  await apiFetch("/storage/bulk", { method: "DELETE", body: { keys } });
}

/** Delete a single object by key. */
export async function deleteStorageObject(key: string): Promise<void> {
  await apiFetch(`/storage/${encodeURIComponent(key)}`, { method: "DELETE" });
}
