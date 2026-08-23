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

export interface WeekRange {
  from: ISODate;
  to: ISODate;
}

/** Local YYYY-MM-DD. Never toISOString(), which is UTC and flips the day early. */
function isoOf(date: Date): ISODate {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local YYYY-MM-DD, `days` before today. */
export function isoDaysAgo(days: number): ISODate {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return isoOf(date);
}

/**
 * A rolling window of `length` days ending `endDaysAgo` days before today.
 *
 * Rolling rather than Monday–Sunday: a calendar week reads as zero every Monday
 * morning, which looks like a broken card rather than a fresh week. `rollingRange(0)`
 * is the last 7 days including today; `rollingRange(7)` is the 7 before that,
 * which is the only honest baseline to compare the first against.
 */
export function rollingRange(endDaysAgo = 0, length = 7): WeekRange {
  return { from: isoDaysAgo(endDaysAgo + length - 1), to: isoDaysAgo(endDaysAgo) };
}

/** Every date in a rolling window, oldest → newest. */
export function rollingDates(endDaysAgo = 0, length = 7): ISODate[] {
  return Array.from({ length }, (_, i) => isoDaysAgo(endDaysAgo + length - 1 - i));
}

/** "11–17 AUG" for a window, spelling both months when it straddles one. */
export function rangeLabel({ from, to }: WeekRange): string | null {
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  if (!start || !end) return null;

  const endMonth = end.toLocaleDateString(undefined, { month: "short" }).toUpperCase();
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${endMonth}`;
  }
  const startMonth = start.toLocaleDateString(undefined, { month: "short" }).toUpperCase();
  return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth}`;
}

/** "M"/"T"/… for a YYYY-MM-DD date, for the chart's axis. */
export function weekdayLetter(iso: string | undefined): string {
  const date = parseIsoDate(iso);
  if (!date) return "";
  return date.toLocaleDateString(undefined, { weekday: "narrow" });
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

/**
 * "11 days" / "1 day" — the length of a silence, or null when it isn't known.
 *
 * Callers must handle the null rather than substituting 0: an at-risk row is
 * one the server put PAST the threshold, so "0 days" can only ever be a field
 * that didn't arrive. See AtRiskClient.daysSilent.
 */
export function silenceLength(days: number | null | undefined): string | null {
  if (days === null || days === undefined) return null;
  return `${days} ${pluralise(days, "day")}`;
}

/** "today" / "yesterday" / "11 days ago". null when the count is unknown. */
export function daysAgoLabel(days: number | null | undefined): string | null {
  if (days === null || days === undefined) return null;
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/** The at-risk headline: "hasn't logged in 11 days" / "joined 3 days ago",
 *  degrading to a wording that claims no number when there isn't one. */
export function silenceHeadline(client: {
  daysSilent: number | null;
  neverActive: boolean;
}): string {
  const ago = daysAgoLabel(client.daysSilent);
  if (client.neverActive) {
    return ago ? `joined ${ago} and hasn't started` : "hasn't started yet";
  }
  const length = silenceLength(client.daysSilent);
  return length ? `hasn't logged in ${length}` : "hasn't logged recently";
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

