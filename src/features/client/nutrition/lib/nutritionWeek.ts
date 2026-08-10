import {
  describeDaySlots,
  normalizeDay,
  planDayList,
  plannedMacros,
  type NutritionDay,
} from "../data";

export type NutritionDayState = "done" | "today" | "upcoming";

export interface NutritionPlanDay {
  day: NutritionDay;
  state: NutritionDayState;
  /** "WED" — the date block's caption. */
  dayOfWeek: string;
  /** "12" — the date block's numeral. Falls back to the day number. */
  dayOfMonth: string;
  title: string;
  mealCount: number;
  /** "Breakfast · Lunch · Dinner", or null on a day with no meals. */
  slots: string | null;
  /** What the planned meals add up to. 0 when the plan carries no per-meal nutrients. */
  plannedKcal: number;
  /** The day's calorie target, when it has one. */
  targetKcal: number | null;
}

export interface NutritionPlanWeek {
  /** 0-based, to match the training screen's stepper. */
  index: number;
  total: number;
  /** "10 – 16 Aug", or "" when no day in the week carries a date. */
  dateRange: string;
  days: NutritionPlanDay[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseIso(value: string | null): Date | null {
  if (!value) return null;
  const parts = value.split("T")[0].split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/** "Mon 10 Aug" — the completed row's result line leads with this. */
export function formatLongDay(iso: string | null): string | null {
  const date = parseIso(iso);
  if (!date) return null;
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

function dateRangeOf(days: { day: NutritionDay }[]): string {
  const dates = days
    .map((entry) => parseIso(entry.day.date))
    .filter((date): date is Date => date !== null)
    .sort((a, b) => a.getTime() - b.getTime());
  if (dates.length === 0) return "";
  const first = dates[0];
  const last = dates[dates.length - 1];
  return first.getMonth() === last.getMonth()
    ? `${first.getDate()} – ${last.getDate()} ${MONTHS[last.getMonth()]}`
    : `${first.getDate()} ${MONTHS[first.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]}`;
}

export function weekCountOf(plan: any, days: NutritionDay[] = []): number {
  const weeks = Array.isArray(plan?.weeks) ? plan.weeks : [];
  if (weeks.length > 0) return weeks.length;
  const fromDays = days.reduce((max, day) => Math.max(max, day.weekNumber), 0);
  if (fromDays > 0) return fromDays;
  const duration = Number(plan?.durationWeeks);
  return Number.isFinite(duration) && duration > 1 ? duration : 1;
}

interface NormalizeOptions {
  /** Today's date as YYYY-MM-DD. */
  todayIso: string;
  /** Today's day id from the calendar, for plans whose days carry no dates. */
  todayDayId?: string | null;
}

/** Every day in the plan, normalized once so the week builders can slice it. */
export function planDays(plan: any, { todayIso, todayDayId }: NormalizeOptions): NutritionDay[] {
  if (!plan) return [];
  return planDayList(plan)
    .map((raw: any) => normalizeDay(raw, plan, todayIso, todayDayId))
    .filter((day: NutritionDay | null): day is NutritionDay => day !== null);
}

function describe(day: NutritionDay): NutritionPlanDay {
  const parsed = parseIso(day.date);
  const mealCount = day.meals.length;

  return {
    day,
    // A finished day is `done` even when it is today — it has nothing left to
    // log, so it belongs under Completed rather than in the CTA card.
    state: day.isFinished ? "done" : day.isToday ? "today" : "upcoming",
    dayOfWeek: parsed ? WEEKDAYS[parsed.getDay()].toUpperCase() : "DAY",
    dayOfMonth: parsed ? String(parsed.getDate()) : String(day.dayNumber || 1),
    title:
      mealCount > 0
        ? `${mealCount} meal${mealCount === 1 ? "" : "s"}`
        : day.isFlexibleDay
          ? "Flexible day"
          : "No meals planned",
    mealCount,
    slots: describeDaySlots(day),
    plannedKcal: Math.round(plannedMacros(day).calories),
    targetKcal:
      typeof day.targets.targetCalories === "number"
        ? Math.round(day.targets.targetCalories)
        : null,
  };
}

/** Build one week's worth of days, in plan order. */
export function buildWeek(
  plan: any,
  weekIndex: number,
  options: NormalizeOptions,
  precomputed?: NutritionDay[]
): NutritionPlanWeek {
  const all = precomputed ?? planDays(plan, options);
  const total = weekCountOf(plan, all);

  // Days carry their own week number, so a plan served flat slices the same way
  // one served as weeks does. Single-week plans keep everything.
  const inWeek = total <= 1 ? all : all.filter((day) => day.weekNumber === weekIndex + 1);
  const days = inWeek
    .map(describe)
    .sort((a, b) => a.day.dayNumber - b.day.dayNumber);

  return { index: weekIndex, total, dateRange: dateRangeOf(days), days };
}

/** The week today falls in, or null when no day in the plan is today. */
export function findTodayWeekIndex(days: NutritionDay[]): number | null {
  const today = days.find((day) => day.isToday);
  return today ? Math.max(0, today.weekNumber - 1) : null;
}
