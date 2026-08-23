/**
 * List endpoints in this API are inconsistent: some return a bare array, and
 * the paginated ones wrap rows in an envelope whose key varies by resource —
 * `docs` on measurements (with counters under `meta`), `data` elsewhere.
 *
 * Reading through this means a caller can't quietly get [] because it guessed
 * the wrong key, which is exactly how the coach's check-in queue came back
 * empty while the API was returning rows.
 */
const LIST_KEYS = ["docs", "data", "items", "results", "records"] as const;

export function unwrapList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object") {
    const envelope = raw as Record<string, unknown>;
    for (const key of LIST_KEYS) {
      if (Array.isArray(envelope[key])) return envelope[key] as T[];
    }
  }
  return [];
}

/** Total row count when the envelope reports one, else the rows returned. */
export function unwrapTotal(raw: unknown, fallbackLength: number): number {
  const envelope = raw && typeof raw === "object" ? (raw as Record<string, any>) : undefined;
  const total = envelope?.meta?.total ?? envelope?.total;
  return typeof total === "number" && Number.isFinite(total) ? total : fallbackLength;
}
