import type { ActivityRowView } from "@/features/coach/home/lib/normalizeActivity";
import { addIsoDays, todayIso } from "@/shared/utils/date";

export interface ActivityDaySection {
  /** YYYY-MM-DD — the section's key and the anchor a day chip jumps to. */
  date: string;
  /** "Today" / "Yesterday" / "Sat 15 Aug". */
  label: string;
  rows: ActivityRowView[];
}

/**
 * Splits the feed into one section per calendar day.
 *
 * Grouped by `loggedAt` — WHEN IT LANDED IN THE FEED — not by `trainingDate`.
 * The API orders rows by the instant they were logged, and this must never
 * re-sort them; grouping by the training day would let a row logged this
 * morning for yesterday's session pull a "Yesterday" heading above rows that
 * are newer than it, and the feed would read as though it jumped backwards.
 * The training day isn't lost either way: normalizeActivityRow already appends
 * it to the row's summary whenever it differs from today.
 *
 * A day that somehow appears twice (rows arriving out of order) is merged into
 * the section already opened for it rather than printing the heading twice.
 */
export function groupByDay(rows: ActivityRowView[]): ActivityDaySection[] {
  const sections: ActivityDaySection[] = [];
  const byDate = new Map<string, ActivityDaySection>();

  for (const row of rows) {
    const date = (row.loggedAt ?? row.trainingDate)?.slice(0, 10);
    // A row with no usable date can't be filed under a day, and inventing one
    // would put it under a heading that lies about when it happened.
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const existing = byDate.get(date);
    if (existing) {
      existing.rows.push(row);
      continue;
    }
    const section: ActivityDaySection = { date, label: dayLabel(date), rows: [row] };
    byDate.set(date, section);
    sections.push(section);
  }

  return sections;
}

/** "Today" / "Yesterday" / "Sat 15 Aug" for a YYYY-MM-DD date. */
export function dayLabel(date: string): string {
  const today = todayIso();
  if (date === today) return "Today";
  if (date === addIsoDays(today, -1)) return "Yesterday";

  const parsed = parseLocalDate(date);
  if (!parsed) return date;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * Parsed at LOCAL noon. `new Date("2026-08-15")` is UTC midnight, which is the
 * previous day at any negative offset — noon keeps the weekday right anywhere.
 */
export function parseLocalDate(date: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
