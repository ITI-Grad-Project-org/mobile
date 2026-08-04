import { File } from 'expo-file-system';

/** An already-hosted URL. These are values to keep, not files to re-upload. */
export function isRemoteUri(uri: unknown): uri is string {
  return typeof uri === 'string' && /^https?:\/\//i.test(uri);
}

/** A local `file://` / `ph://` / content URI picked on-device — needs uploading. */
export function isLocalFileUri(uri: unknown): uri is string {
  return typeof uri === 'string' && uri.trim() !== '' && !isRemoteUri(uri);
}

function extFor(uri: string): string {
  const match = /\.(\w+)(?:\?.*)?$/.exec(uri);
  return match ? match[1].toLowerCase() : 'jpg';
}


export function appendFile(
  form: FormData,
  field: string,
  uri: unknown,
  name?: string
): boolean {
  if (!isLocalFileUri(uri)) return false;
  try {
    const file = new File(uri);
    if (!file.exists) return false;
    // Cast: the DOM typings only allow Blob, but expo's fetch accepts anything
    // exposing bytes(). The 3rd arg is honoured only for real Blobs, so the
    // filename that actually ships is `file.name`.
    form.append(field, file as unknown as Blob, name);
    return true;
  } catch {
    // Unreadable URI (revoked permission, cleared cache) — drop this part
    // rather than failing the whole save.
    return false;
  }
}

/** Append several binary parts under one repeated field name. */
export function appendFiles(
  form: FormData,
  field: string,
  uris: readonly unknown[] | undefined,
  namePrefix = field
): number {
  let written = 0;
  (uris ?? []).forEach((uri) => {
    if (appendFile(form, field, uri, `${namePrefix}-${written}.${extFor(String(uri))}`)) {
      written += 1;
    }
  });
  return written;
}

/**
 * Append flat scalar fields, dropping null/undefined so a PATCH only carries
 * what was actually set. Arrays are appended as repeated parts.
 */
export function appendFields(form: FormData, fields: object): void {
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((v) => v != null && form.append(key, String(v)));
      return;
    }
    form.append(key, String(value));
  });
}
