import { formatDateRange } from "@/features/shared/plans/lib/programWeek";

export type DayState = "past" | "today" | "upcoming";

export interface CoachNutritionDay {
  id: string;
  dayNumber: number;
  /** ISO date (YYYY-MM-DD), when the payload carries one. */
  date: string | null;
  /** "WED" — the date block's caption. */
  dayOfWeek: string;
  /** "12" — the date block's numeral. Falls back to the day number. */
  dayOfMonth: string;
  isFlexibleDay: boolean;
  mealCount: number;
  /** "Breakfast · Lunch · Dinner", or null on a day with no meals. */
  mealSummary: string | null;
  calories: number | null;
  state: DayState;
  /** The raw day, for the day screen to read meals off. */
  raw: any;
}

export interface CoachNutritionWeek {
  index: number;
  total: number;
  /** "10 – 16 Aug", or "" when the payload has no dates. */
  dateRange: string;
  days: CoachNutritionDay[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isoOf(value: unknown): string | null {
  return typeof value === "string" && value ? value.split("T")[0] : null;
}

function parseIso(value: string | null): Date | null {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export { todayIso } from "@/shared/utils/date";

function stateOf(iso: string | null, today: string): DayState {
  if (!iso) return "upcoming";
  if (iso === today) return "today";
  return iso < today ? "past" : "upcoming";
}

function weeksOf(plan: any): any[] {
  return Array.isArray(plan?.weeks) ? plan.weeks : [];
}

/** The raw day array for a week index, whichever shape the payload uses. */
function rawDaysFor(plan: any, weekIndex: number): any[] {
  const weeks = weeksOf(plan);
  if (weeks.length > 0) {
    const days = weeks[weekIndex]?.days;
    return Array.isArray(days) ? days : [];
  }

  const flat = plan?.days;
  if (!Array.isArray(flat) || flat.length === 0) return [];
  const matching = flat.filter((d: any) => (d?.weekNumber || 1) === weekIndex + 1);
  if (matching.length > 0) return matching;
  return flat.slice(weekIndex * 7, (weekIndex + 1) * 7);
}

export function nutritionWeekCount(plan: any): number {
  const weeks = weeksOf(plan);
  if (weeks.length > 0) return weeks.length;
  if (typeof plan?.durationWeeks === "number" && plan.durationWeeks > 0) {
    return plan.durationWeeks;
  }
  return 1;
}

/** "Breakfast · Lunch · Dinner" — the slots this day actually prescribes. */
function mealSummaryOf(meals: any[]): string | null {
  const names = meals
    .map((meal) => meal?.mealName || meal?.slot)
    .filter(Boolean)
    .map((name: any) => String(name).replace(/_/g, " "));
  return names.length > 0 ? names.join(" · ") : null;
}

export function mealsOf(day: any): any[] {
  const meals = day?.meals;
  if (!Array.isArray(meals)) return [];
  return [...meals].sort((a, b) => (a?.position ?? 0) - (b?.position ?? 0));
}

export function buildNutritionWeek(
  plan: any,
  weekIndex: number,
  today: string
): CoachNutritionWeek {
  const days: CoachNutritionDay[] = rawDaysFor(plan, weekIndex)
    .filter(Boolean)
    .map((day: any, index: number): CoachNutritionDay => {
      const iso = isoOf(day?.scheduledDate ?? day?.date);
      const parsed = parseIso(iso);
      const dayNumber = Number(day?.dayNumber ?? index + 1);
      const meals = mealsOf(day);
      const calories = day?.prescribedTotals?.calories ?? day?.effectiveTargets?.calories;

      return {
        id: String(day?.id ?? `day-${weekIndex}-${index}`),
        dayNumber,
        date: iso,
        dayOfWeek: parsed ? WEEKDAYS[parsed.getDay()].toUpperCase() : "DAY",
        dayOfMonth: parsed ? String(parsed.getDate()) : String(dayNumber),
        isFlexibleDay: Boolean(day?.isFlexibleDay),
        mealCount: meals.length,
        mealSummary: mealSummaryOf(meals),
        calories: typeof calories === "number" ? calories : null,
        state: stateOf(iso, today),
        raw: day,
      };
    })
    .sort((a, b) => a.dayNumber - b.dayNumber);

  return {
    index: weekIndex,
    total: nutritionWeekCount(plan),
    dateRange: formatDateRange(days.map((d) => d.date)),
    days,
  };
}

/** The week today falls in, or null when the plan carries no matching date. */
export function findNutritionTodayWeek(plan: any, today: string): number | null {
  const total = nutritionWeekCount(plan);
  for (let i = 0; i < total; i += 1) {
    if (buildNutritionWeek(plan, i, today).days.some((d) => d.state === "today")) return i;
  }
  return null;
}

/**
 * Walk every week of a plan (training or nutrition) for a day by id — the day
 * screens read their prescription out of the parent plan's cached payload
 * rather than refetching it.
 */
export function findDayById(plan: any, dayId: string): any | null {
  if (!plan || !dayId) return null;

  const pools: any[][] = [];
  for (const week of weeksOf(plan)) {
    if (Array.isArray(week?.days)) pools.push(week.days);
  }
  for (const key of ["days", "programDays"]) {
    const flat = plan?.[key];
    if (Array.isArray(flat)) pools.push(flat);
  }

  for (const pool of pools) {
    const found = pool.find((day: any) => String(day?.id) === String(dayId));
    if (found) return found;
  }
  return null;
}

/** Planned exercises on a training day, across the shapes the API may use. */
export function exercisesOf(day: any): any[] {
  const list = day?.exercises ?? day?.prescribedExercises ?? day?.plannedExercises;
  return Array.isArray(list) ? list : [];
}

/** Prescribed sets on a planned exercise. */
export function setsOf(exercise: any): any[] {
  const list = exercise?.sets ?? exercise?.prescribedSets ?? exercise?.plannedSets;
  return Array.isArray(list) ? list : [];
}

/** All days of a plan, flattened across its weeks. */
function allDaysOf(plan: any): any[] {
  const days: any[] = [];
  for (const week of weeksOf(plan)) {
    if (Array.isArray(week?.days)) days.push(...week.days);
  }
  if (days.length === 0) {
    for (const key of ["days", "programDays"]) {
      const flat = plan?.[key];
      if (Array.isArray(flat)) days.push(...flat);
    }
  }
  return days;
}

export interface PlanSchedule {
  /** Day 4 of 14 — 1-based, clamped into the plan; 0 before it starts. */
  elapsedDays: number;
  totalDays: number;
  /** 0–1 for the progress track. */
  ratio: number;
  startDate: string | null;
  endDate: string | null;
}

/**
 * Where the plan is in its own run. Dates come from the payload where it has
 * them and are derived from startDate + durationWeeks where it doesn't — the
 * training DTOs never promised an endDate.
 */
export function planSchedule(plan: any, today: string): PlanSchedule {
  const startDate = isoOf(plan?.startDate);
  const durationWeeks = Number(plan?.durationWeeks);
  const dayCount = allDaysOf(plan).length;

  const totalDays =
    dayCount > 0
      ? dayCount
      : Number.isFinite(durationWeeks) && durationWeeks > 0
        ? Math.round(durationWeeks * 7)
        : 0;

  const start = parseIso(startDate);
  // No endDate is guaranteed by either DTO, so fall back to the last scheduled day.
  const endDate =
    isoOf(plan?.endDate) ?? (totalDays > 0 ? addDays(startDate, totalDays - 1) : null);

  const now = parseIso(today);
  const elapsed =
    start && now ? Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1 : 0;
  const elapsedDays = Math.max(0, Math.min(totalDays, elapsed));

  return {
    elapsedDays,
    totalDays,
    ratio: totalDays > 0 ? elapsedDays / totalDays : 0,
    startDate,
    endDate,
  };
}

function addDays(iso: string | null, days: number): string | null {
  const date = parseIso(iso);
  if (!date) return null;
  const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  const month = String(shifted.getMonth() + 1).padStart(2, "0");
  const day = String(shifted.getDate()).padStart(2, "0");
  return `${shifted.getFullYear()}-${month}-${day}`;
}

/** "4 days ago" / "today" — how long the client has had this plan. */
export function relativeSince(iso: string | null, today: string): string | null {
  const start = parseIso(iso);
  const now = parseIso(today);
  if (!start || !now) return null;

  const days = Math.round((now.getTime() - start.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days < 0) return days === -1 ? "tomorrow" : `in ${Math.abs(days)} days`;
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks < 9 ? `${weeks} weeks ago` : `${Math.floor(days / 30)} months ago`;
}

/**
 * "Started 4 days ago" / "Starts tomorrow" — the verb has to follow the tense,
 * so the whole phrase is built here rather than prefixed at the call site.
 */
export function describePlanStart(iso: string | null, today: string): string | null {
  const start = parseIso(iso);
  const now = parseIso(today);
  if (!start || !now) return null;

  const days = Math.round((now.getTime() - start.getTime()) / 86_400_000);
  if (days === 0) return "Starts today";
  if (days < 0) return `Starts ${relativeSince(iso, today)}`;
  return `Started ${relativeSince(iso, today)}`;
}

export interface ProgramStats {
  sessions: number;
  restDays: number;
  /** Sessions per week, rounded to one decimal when it isn't whole. */
  frequency: string;
}

/** Training volume, counted off whatever day shape the payload uses. */
export function programStats(plan: any): ProgramStats {
  const days = allDaysOf(plan);
  const isRest = (day: any) =>
    Boolean(day?.isRestDay || day?.isRest || day?.type === "rest") ||
    exercisesOf(day).length === 0;

  const restDays = days.filter(isRest).length;
  const sessions = days.length - restDays;

  const weeks =
    weeksOf(plan).length ||
    (Number.isFinite(Number(plan?.durationWeeks)) ? Number(plan.durationWeeks) : 0) ||
    (days.length > 0 ? Math.max(1, Math.round(days.length / 7)) : 0);

  const perWeek = weeks > 0 ? sessions / weeks : 0;
  const frequency = perWeek > 0 ? `${Math.round(perWeek * 10) / 10}/wk` : "—";

  return { sessions, restDays, frequency };
}

/** Meals per day, averaged over the days that actually prescribe any. */
export function nutritionMealsPerDay(plan: any): number | null {
  const days = allDaysOf(plan).filter((day) => mealsOf(day).length > 0);
  if (days.length === 0) return null;
  const total = days.reduce((sum, day) => sum + mealsOf(day).length, 0);
  return Math.round(total / days.length);
}

/** "Mon 10 Aug" — a day header's date line. */
export function formatDayDate(iso: string | null): string | null {
  const date = parseIso(iso);
  if (!date) return null;
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}
