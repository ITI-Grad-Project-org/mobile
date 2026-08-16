import type { CurrencyAmounts, ISODate } from "@/api/types";
import { DASH } from "@/shared/utils/pct";

/**
 * The thresholds /analytics/attention uses when you pass none. Home passes
 * none on purpose — overview.attentionCounts is computed at these same
 * defaults, so a badge saying 3 opens a list of 3. Copy reads them from here
 * rather than hardcoding "14" so the two can never drift.
 */
export const DEFAULT_RISK_THRESHOLD_DAYS = 7;
export const DEFAULT_ENDING_HORIZON_DAYS = 14;

/** Pct rendering moved to shared once the coach clients feature needed it too.
 *  Re-exported here so Home's existing imports keep reading from one place. */
export { DASH, formatPct, formatPctShort } from "@/shared/utils/pct";

/**
 * MRR is a map keyed by ISO 4217, not a total. There is no FX rate in the
 * system, so one line per currency — summing them invents a number, and a
 * single-currency practice just gets a one-entry map.
 */
export function formatMrrLines(mrr: CurrencyAmounts | undefined): string[] {
  if (!mrr) return [];
  return Object.entries(mrr).map(
    ([code, amount]) => `${code} ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  );
}

/**
 * "10–16 AUG" for the Mon–Sun week the window ENDS in. The card is labelled
 * from the window, never the literal words "this week", because a coach who
 * changes the range gets that week's numbers, not today's.
 */
export function weekLabelFrom(windowEnd: ISODate | undefined): string | null {
  const end = parseIsoDate(windowEnd);
  if (!end) return null;

  // Monday-based: JS getDay() is 0=Sunday, so Sunday steps back a full 6.
  const offsetToMonday = (end.getDay() + 6) % 7;
  const monday = new Date(end);
  monday.setDate(end.getDate() - offsetToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const month = sunday.toLocaleDateString(undefined, { month: "short" }).toUpperCase();
  return `${monday.getDate()}–${sunday.getDate()} ${month}`;
}

/** "14:32" / "Mon" / "3 Aug" depending on how far back the row is. */
export function formatLoggedAt(iso: string | undefined): string {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  const daysAgo = (now.getTime() - date.getTime()) / 86_400_000;
  if (daysAgo < 7) return date.toLocaleDateString(undefined, { weekday: "short" });
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** "22 Jun" from an ISO calendar date, for the ending-soon subtitle. */
export function formatShortDate(iso: ISODate | undefined): string {
  const date = parseIsoDate(iso);
  if (!date) return DASH;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Whole days between an ISO timestamp and now, floored at 0. */
export function daysSince(iso: string | undefined): number | null {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

export function initialsOf(name: string | undefined): string {
  if (!name) return DASH;
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || DASH;
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

/**
 * A calendar date parsed at LOCAL noon. `new Date("2026-08-15")` parses as UTC
 * midnight, which is the previous day in any negative offset — noon keeps the
 * weekday correct everywhere.
 */
function parseIsoDate(iso: string | undefined): Date | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Today in the same base as Overview.thisWeek.byDay[].weekday (1 = Monday …
 * 7 = Sunday). The base is documented but unverified against a live response,
 * so WeekActivityChart buckets by date rather than trusting a weekday index.
 */
export function todayWeekdayMondayBased(): number {
  const day = new Date().getDay(); // 0 = Sunday
  return day === 0 ? 7 : day;
}
