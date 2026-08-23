import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';

import { BASE_URL } from './config';
import { refreshAccessToken } from './tokenRefresh';

const TIMEOUT_MS = 45_000;
const MAX_ATTEMPTS = 3;
/** Backoff before attempt 2 and 3. */
const BACKOFF_MS = [800, 2_400];

/** Statuses worth retrying — a gateway hiccup, not a rejected request. */
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export class MediaUploadError extends Error {
  readonly status: number;

  constructor(status: number, body?: string) {
    let detail = body?.trim() ?? '';
    try {
      const parsed = JSON.parse(detail);
      if (parsed && typeof parsed.message === 'string') {
        detail = Array.isArray(parsed.message)
          ? parsed.message.join(', ')
          : parsed.message;
      }
    } catch {
      // Not JSON (HTML error page or empty body) — keep the raw text.
    }
    super(detail ? `${detail} (${status})` : `Upload failed (${status})`);
    this.name = 'MediaUploadError';
    this.status = status;
  }
}

function guessMimeType(uri: string): string {
  const ext = /\.(\w+)(?:\?.*)?$/.exec(uri)?.[1]?.toLowerCase() ?? 'jpg';
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    default:
      return 'image/jpeg';
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface UploadFileArgs {
  /** Path relative to the API base, e.g. `/coaches/me/avatar`. */
  path: string;
  method: 'POST' | 'PUT' | 'PATCH';
  /** Multipart field name for the binary part (`avatar`, `photos`, `file`…). */
  fieldName: string;
  fileUri: string;
  /** Extra flat text parts sent alongside the file. */
  fields?: Record<string, string | number | undefined | null>;
  /** Query string appended to `path`. */
  params?: Record<string, string>;
  /** Overrides the extension-guessed MIME type. */
  mimeType?: string;
  tenantId?: string | null;
}

function buildUrl(path: string, params?: Record<string, string>): string {
  const url = `${BASE_URL}${path}`;
  if (!params) return url;
  const qs = new URLSearchParams(params).toString();
  return qs ? `${url}?${qs}` : url;
}

async function buildHeaders(tenantId?: string | null): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantId) headers['x-tenant-id'] = tenantId;
  return headers;
}

/** One attempt, with a hard timeout that actually cancels the native task. */
async function attemptUpload(
  args: UploadFileArgs
): Promise<FileSystem.FileSystemUploadResult> {
  const parameters: Record<string, string> = {};
  Object.entries(args.fields ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      parameters[key] = String(value);
    }
  });

  const task = FileSystem.createUploadTask(
    buildUrl(args.path, args.params),
    args.fileUri,
    {
      httpMethod: args.method,
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: args.fieldName,
      mimeType: args.mimeType ?? guessMimeType(args.fileUri),
      parameters,
      headers: await buildHeaders(args.tenantId),
    }
  );

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      task.uploadAsync(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          // Cancel so the socket is released instead of leaking until the OS
          // gives up — otherwise a retry competes with the hung request.
          task.cancelAsync().catch(() => {});
          reject(new Error('Upload timed out'));
        }, TIMEOUT_MS);
      }),
    ]);
    if (!result) throw new Error('Upload was cancelled');
    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Upload one file, retrying transient failures and refreshing once on 401.
 * Resolves with the parsed JSON body, or `null` when the response has none.
 */
export async function uploadFile<T = unknown>(args: UploadFileArgs): Promise<T | null> {
  let lastError: Error | undefined;
  let refreshed = false;
  let attempt = 0;

  while (attempt < MAX_ATTEMPTS) {
    let result: FileSystem.FileSystemUploadResult;
    try {
      result = await attemptUpload(args);
    } catch (e) {
      // Network-level failure (dropped connection, timeout) — always retryable.
      lastError = e instanceof Error ? e : new Error('Upload failed');
      attempt += 1;
      if (attempt < MAX_ATTEMPTS) await sleep(BACKOFF_MS[attempt - 1] ?? 2_400);
      continue;
    }

    if (result.status >= 200 && result.status < 300) {
      if (!result.body) return null;
      try {
        return JSON.parse(result.body) as T;
      } catch {
        return null; // 2xx with a non-JSON body still means success.
      }
    }

    // An expired token isn't a failed attempt — refresh and re-send at once,
    // without spending a retry slot or waiting out a backoff.
    if (result.status === 401 && !refreshed) {
      refreshed = true;
      if (await refreshAccessToken()) continue;
    }

    lastError = new MediaUploadError(result.status, result.body);
    if (!RETRYABLE_STATUS.has(result.status)) throw lastError;

    attempt += 1;
    if (attempt < MAX_ATTEMPTS) await sleep(BACKOFF_MS[attempt - 1] ?? 2_400);
  }

  throw lastError ?? new Error('Upload failed');
}
