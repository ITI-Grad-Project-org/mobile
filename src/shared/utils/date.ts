/**
 * Calendar-date helpers.
 *
 * `toISOString()` renders the date in UTC, so anywhere east of Greenwich it
 * still reports yesterday during the first hours after local midnight (Cairo is
 * UTC+3, so 00:30 on the 10th is 21:30 on the 9th in UTC). "Today" in this app
 * always means the user's local calendar day, so build the key from the local
 * getFullYear/getMonth/getDate parts instead.
 */

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** "YYYY-MM-DD" for the given date in the device's local timezone. */
export function toLocalIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** The device's local calendar day as "YYYY-MM-DD". */
export function todayIso(): string {
  return toLocalIsoDate(new Date());
}

/**
 * Whole local calendar days between `iso` and today. Negative for a future
 * date, null when the string isn't a date. Both sides are anchored at midday so
 * a DST shift can't round the difference to the wrong day.
 */
export function daysSinceIso(iso: string): number | null {
  const parts = iso.slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const then = new Date(parts[0], parts[1] - 1, parts[2], 12).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime();
  return Math.round((today - then) / 86_400_000);
}

/** "today" · "yesterday" · "5d ago" · "3w ago" · "2mo ago". */
export function relativeDayLabel(iso: string): string {
  const days = daysSinceIso(iso);
  if (days === null) return iso.slice(0, 10);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

/**
 * "YYYY-MM-DD" `days` after the given one. Built from local Date parts so month
 * ends and DST shifts land on the right calendar day.
 */
export function addIsoDays(iso: string, days: number): string | null {
  const parts = iso.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return toLocalIsoDate(new Date(parts[0], parts[1] - 1, parts[2] + days));
}
