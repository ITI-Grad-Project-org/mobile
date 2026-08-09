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
 * "YYYY-MM-DD" `days` after the given one. Built from local Date parts so month
 * ends and DST shifts land on the right calendar day.
 */
export function addIsoDays(iso: string, days: number): string | null {
  const parts = iso.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return toLocalIsoDate(new Date(parts[0], parts[1] - 1, parts[2] + days));
}
