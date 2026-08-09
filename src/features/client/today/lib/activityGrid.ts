import type { ActivityGraphDay, ActivityGraphLevel } from "@/api/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** A slot with no day behind it: before the graph's range, or after today. */
export interface PadCell {
  kind: "pad";
  /**
   * After today. These aren't drawn at all — the grid ends on today's square and
   * grows a cell at a time as the days arrive. Pads BEFORE the range still have
   * to hold their space, or the first column's rows slide off their weekdays.
   */
  future: boolean;
}
export interface DayCellData {
  kind: "day";
  date: string; // YYYY-MM-DD
  level: ActivityGraphLevel;
  activityCount: number;
  isToday: boolean;
}
export type Cell = PadCell | DayCellData;

export interface MonthLabel {
  /** Column the label sits above. */
  col: number;
  label: string;
}

export interface ActivityGrid {
  /** `weeks` columns of 7 cells; column 0 is oldest, row 0 is Sunday. */
  columns: Cell[][];
  monthLabels: MonthLabel[];
  /** Row indices (0 = Sun) that get a weekday label in the gutter. */
  weekdayRows: { row: number; label: string }[];
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Parse a date-only string without the UTC shift `new Date(str)` would apply. */
function parseIso(value: string): Date | null {
  const parts = value.split("T")[0].split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function todayInZone(timeZone?: string): string {
  const local = toIso(new Date());
  if (!timeZone) return local;
  let zoned: string;
  try {
    // en-CA formats as YYYY-MM-DD.
    zoned = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    // An unrecognised zone must not blank the grid — fall back to local.
    return local;
  }
  // Never let the graph's day lag the device's. A server zone behind the device
  // (it reports UTC while the phone is UTC+3) would otherwise mark yesterday as
  // "today" and pad out the square the user is actually filling in — and the
  // `todayLevelFloor` from the Today checklist is keyed to the LOCAL day, so it
  // would land on the wrong cell. A zone AHEAD of the device still wins.
  return zoned > local ? zoned : local;
}

/** "Mon 4 Mar" — the tapped-day caption leads with this. */
export function formatCellDate(iso: string): string {
  const date = parseIso(iso);
  if (!date) return iso;
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** Intensity bucket for a partially-finished day, matching the server's 0–4 scale. */
export function levelFromProgress(completed: number, total: number): ActivityGraphLevel {
  if (total <= 0 || completed <= 0) return 0;
  const bucket = Math.round((completed / total) * 4);
  return Math.max(0, Math.min(4, bucket)) as ActivityGraphLevel;
}

export interface BuildGridOptions {
  days: ActivityGraphDay[];
  /** Today in the graph's timezone — see `todayInZone`. */
  todayIso: string;
  weeks?: number;
  todayLevelFloor?: ActivityGraphLevel;
}

export function buildActivityGrid({
  days,
  todayIso,
  weeks = 18,
  todayLevelFloor = 0,
}: BuildGridOptions): ActivityGrid {
  const byDate = new Map<string, ActivityGraphDay>();
  let earliest: string | null = null;
  for (const day of days) {
    const iso = day.date?.split("T")[0];
    if (!iso) continue;
    byDate.set(iso, day);
    if (!earliest || iso < earliest) earliest = iso;
  }

  const today = parseIso(todayIso) ?? new Date();
  // Anchor the last column on the week today falls in, then walk back.
  const lastSunday = addDays(today, -today.getDay());
  const firstSunday = addDays(lastSunday, -(weeks - 1) * 7);

  const columns: Cell[][] = [];
  for (let col = 0; col < weeks; col += 1) {
    const week: Cell[] = [];
    for (let row = 0; row < 7; row += 1) {
      const iso = toIso(addDays(firstSunday, col * 7 + row));
      // Future days, and anything older than the graph's range, are structural
      // padding — drawing them as level 0 would claim a rest day we know nothing about.
      if (iso > todayIso) {
        week.push({ kind: "pad", future: true });
        continue;
      }
      if (earliest && iso < earliest) {
        week.push({ kind: "pad", future: false });
        continue;
      }
      const day = byDate.get(iso);
      const isToday = iso === todayIso;
      // A day inside the range but absent from the payload (the API's `period.to`
      // can lag today) is a real, empty day rather than padding.
      let level: ActivityGraphLevel = day?.level ?? 0;
      if (isToday && todayLevelFloor > level) level = todayLevelFloor;
      week.push({
        kind: "day",
        date: iso,
        level,
        activityCount: day?.activityCount ?? 0,
        isToday,
      });
    }
    columns.push(week);
  }

  return {
    columns,
    monthLabels: monthLabelsFor(firstSunday, weeks),
    weekdayRows: [
      { row: 1, label: "M" },
      { row: 3, label: "W" },
      { row: 5, label: "F" },
    ],
  };
}

function monthLabelsFor(firstSunday: Date, weeks: number): MonthLabel[] {
  const labels: MonthLabel[] = [];
  let lastMonth = -1;
  let lastLabelCol = -Infinity;

  for (let col = 0; col < weeks; col += 1) {
    const month = addDays(firstSunday, col * 7).getMonth();
    if (month !== lastMonth) {
      if (lastMonth !== -1 && col - lastLabelCol >= 2) {
        labels.push({ col, label: MONTHS[month] });
        lastLabelCol = col;
      } else if (lastMonth === -1) {
        labels.push({ col, label: MONTHS[month] });
        lastLabelCol = col;
      }
      lastMonth = month;
    }
  }

  // Drop the leading label when the very next column starts a new month —
  // that first column is a stub of the previous month and the two would overlap.
  if (labels.length > 1 && labels[0].col === 0 && labels[1].col === 1) labels.shift();
  return labels;
}
