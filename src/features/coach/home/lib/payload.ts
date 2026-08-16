/**
 * Shared readers for the analytics payloads.
 *
 * None of the /analytics/* responses have a body schema in Swagger — core-api
 * documents the params and defers the shape to analytics-service — so the
 * interfaces in src/api/types.ts are transcribed from prose. Reading through
 * these helpers means a field that turns out to be spelled differently, nested,
 * or of another type degrades to "not shown" instead of crashing the screen or
 * silently rendering an empty list as "nothing to do".
 */

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

/** First non-empty string among dotted paths, e.g. "client.firstName". */
export function pick(row: Record<string, unknown>, paths: string[]): string | undefined {
  for (const path of paths) {
    const value = asString(read(row, path));
    if (value) return value;
  }
  return undefined;
}

export function pickNumber(row: Record<string, unknown>, paths: string[]): number | undefined {
  for (const path of paths) {
    const value = asNumber(read(row, path));
    if (value !== undefined) return value;
  }
  return undefined;
}

export function pickBool(row: Record<string, unknown>, paths: string[]): boolean {
  for (const path of paths) {
    const value = read(row, path);
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return false;
}

/**
 * The first array found under any of `paths`, unwrapping a `{ items: [] }`
 * style envelope on the way. Returns [] when nothing matches, so callers never
 * have to guard `.map`.
 */
export function pickList(source: unknown, paths: string[]): unknown[] {
  const root = asRecord(source);
  if (!root) return Array.isArray(source) ? source : [];

  for (const path of paths) {
    const value = read(root, path);
    if (Array.isArray(value)) return value;
    const nested = asRecord(value);
    if (nested) {
      for (const key of ["items", "data", "rows", "results"]) {
        if (Array.isArray(nested[key])) return nested[key] as unknown[];
      }
    }
  }
  return [];
}

function read(row: Record<string, unknown>, path: string): unknown {
  let cursor: unknown = row;
  for (const key of path.split(".")) {
    cursor = asRecord(cursor)?.[key];
    if (cursor === undefined) return undefined;
  }
  return cursor;
}

/** A person's display name, wherever the payload hangs it. */
export function nameFrom(row: Record<string, unknown>, fallback = "Client"): string {
  const direct = pick(row, [
    "clientName",
    "client.name",
    "client.fullName",
    "membership.client.name",
    "user.name",
    "name",
  ]);
  if (direct) return direct;

  for (const base of ["client", "membership.client", "user", ""]) {
    const prefix = base ? `${base}.` : "";
    const first = pick(row, [`${prefix}firstName`, `${prefix}givenName`]);
    const last = pick(row, [`${prefix}lastName`, `${prefix}familyName`]);
    const joined = [first, last].filter(Boolean).join(" ").trim();
    if (joined) return joined;
  }

  return pick(row, ["client.email", "user.email", "email"]) ?? fallback;
}
