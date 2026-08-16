import type { Pct } from "@/api/types";

/** What a null Pct renders as, everywhere. */
export const DASH = "—";

/**
 * A percentage for display. null means the denominator was zero — there was no
 * basis to answer — so it renders a dash. Never `?? 0`: a client with nothing
 * scheduled has not failed to train.
 */
export function formatPct(value: Pct): string {
  if (value === null || value === undefined) return DASH;
  return `${value.toFixed(1)}%`;
}

/** Same contract, without the decimal — for tight spots like a stat tile. */
export function formatPctShort(value: Pct): string {
  if (value === null || value === undefined) return DASH;
  return `${Math.round(value)}%`;
}
