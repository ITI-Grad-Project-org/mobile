/**
 * The program payload is loosely typed (`any` all the way down — see
 * api/endpoints/training.endpoints.ts) and the API has spelled several of these
 * fields more than one way. Everything here reads defensively and hands the
 * screen the one shape it renders: weeks of workouts, each in a single state.
 */

export type WorkoutState = "done" | "today" | "upcoming";

export interface ProgramWorkout {
  id: string;
  dayNumber: number;
  /** ISO date (YYYY-MM-DD) when the payload carries one. */
  date: string | null;
  /** "WED" — the date block's caption. */
  dayOfWeek: string;
  /** "12" — the date block's numeral. Falls back to the day number. */
  dayOfMonth: string;
  title: string;
  exerciseCount: number;
  durationMin: number;
  focusTags: string[];
  state: WorkoutState;
  /** Minutes actually spent. Only ever set on a `done` workout. */
  actualDurationMin: number | null;
}

export interface ProgramWeek {
  /** 0-based. */
  index: number;
  total: number;
  /** "10 – 16 Aug", or "" when the payload has no dates to derive it from. */
  dateRange: string;
  workouts: ProgramWorkout[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Parse a date-only string without the UTC shift `new Date(str)` would apply. */
function parseIso(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  const parts = value.split("T")[0].split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function isoOf(value: unknown): string | null {
  return typeof value === "string" && value ? value.split("T")[0] : null;
}

/** "Mon 10 Aug" — the completed row's result line leads with this. */
export function formatLongDay(iso: string | null): string | null {
  const date = parseIso(iso);
  if (!date) return null;
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

function dateRangeOf(workouts: { date: string | null }[]): string {
  const dates = workouts
    .map((w) => parseIso(w.date))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());
  if (dates.length === 0) return "";
  const first = dates[0];
  const last = dates[dates.length - 1];
  const sameMonth = first.getMonth() === last.getMonth();
  return sameMonth
    ? `${first.getDate()} – ${last.getDate()} ${MONTHS[last.getMonth()]}`
    : `${first.getDate()} ${MONTHS[first.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]}`;
}

/** The API has spelled "this day is finished" several ways; match on any of them. */
function isDone(day: any): boolean {
  const status = String(day?.status ?? day?.log?.status ?? "").toLowerCase();
  if (status === "completed" || status === "done") return true;
  return Boolean(day?.completedAt || day?.log?.completedAt || day?.log?.finishedAt);
}

function isRest(day: any): boolean {
  return Boolean(day?.isRestDay || day?.isRest || day?.type === "rest");
}

function exerciseListOf(day: any): any[] {
  const list = day?.exercises || day?.prescribedExercises || day?.loggedExercises || [];
  return Array.isArray(list) ? list : [];
}

function focusTagsOf(day: any, exercises: any[]): string[] {
  const explicit = day?.focusTags || day?.tags || (day?.focus ? [day.focus] : null);
  if (Array.isArray(explicit) && explicit.length > 0) {
    return explicit.filter(Boolean).map((tag: any) => String(tag).replace(/_/g, " "));
  }
  // Nothing declared, so infer the focus from what the day actually trains.
  const muscles = exercises
    .map((ex: any) => ex?.exercise?.primaryMuscle || ex?.primaryMuscle)
    .filter(Boolean)
    .map((m: any) => String(m).replace(/_/g, " "));
  return Array.from(new Set(muscles)).slice(0, 2);
}

function minutesOf(value: unknown): number | null {
  return typeof value === "number" && value > 0 ? Math.round(value) : null;
}

interface NormalizeOptions {
  /** Today's date as YYYY-MM-DD. */
  todayIso: string;
  /** Today's scheduled day id from the calendar, when the plan payload has no dates. */
  todayDayId?: string | null;
}

/** Pull the raw day array for a week index out of whichever shape the payload uses. */
function rawDaysFor(program: any, weeks: any[], weekIndex: number): any[] {
  if (weeks.length > 0) return weeks[weekIndex]?.days || weeks[0]?.days || [];

  const flat = program?.days || program?.programDays || [];
  if (!Array.isArray(flat) || flat.length === 0) return [];

  const matching = flat.filter((d: any) => (d?.weekNumber || 1) === weekIndex + 1);
  if (matching.length > 0) return matching;
  if (flat.length > 7) return flat.slice(weekIndex * 7, (weekIndex + 1) * 7);
  return flat;
}

export function weekCountOf(program: any): number {
  const weeks = Array.isArray(program?.weeks) ? program.weeks : [];
  if (weeks.length > 0) return weeks.length;
  if (typeof program?.durationWeeks === "number" && program.durationWeeks > 1) {
    return program.durationWeeks;
  }
  return 1;
}

/**
 * Build one week's worth of workouts. Rest days are dropped entirely — the
 * counts and the progress bar are about workouts only.
 */
export function buildWeek(
  program: any,
  weekIndex: number,
  { todayIso, todayDayId }: NormalizeOptions
): ProgramWeek {
  const weeks = Array.isArray(program?.weeks) ? program.weeks : [];
  const total = weekCountOf(program);
  const rawDays = rawDaysFor(program, weeks, weekIndex);

  const workouts: ProgramWorkout[] = rawDays
    .filter((day: any) => day && !isRest(day))
    .map((day: any, index: number): ProgramWorkout => {
      const iso = isoOf(day?.scheduledDate ?? day?.date ?? day?.scheduledAt);
      const parsed = parseIso(iso);
      const dayNumber = Number(day?.dayNumber || day?.position || index + 1);
      const exercises = exerciseListOf(day);
      const done = isDone(day);
      const isToday = Boolean((todayDayId && day?.id === todayDayId) || (iso && iso === todayIso));

      return {
        id: String(day?.id ?? `day-${weekIndex}-${index}`),
        dayNumber,
        date: iso,
        dayOfWeek: parsed ? WEEKDAYS[parsed.getDay()].toUpperCase() : "DAY",
        dayOfMonth: parsed ? String(parsed.getDate()) : String(dayNumber),
        title: day?.name || day?.title || `Workout day ${dayNumber}`,
        exerciseCount: exercises.length,
        durationMin:
          minutesOf(day?.estimatedMinutes ?? day?.estimatedDurationMinutes) ??
          Math.max(20, exercises.length * 8),
        focusTags: focusTagsOf(day, exercises),
        // A finished day is `done` even when it is today — it has nothing left
        // to start, so it belongs in Completed rather than the CTA card.
        state: done ? "done" : isToday ? "today" : "upcoming",
        actualDurationMin: done
          ? minutesOf(day?.log?.durationMinutes ?? day?.durationMinutes ?? day?.actualMinutes)
          : null,
      };
    })
    .sort((a, b) => a.dayNumber - b.dayNumber);

  return {
    index: weekIndex,
    total,
    dateRange: dateRangeOf(workouts),
    workouts,
  };
}

/** The week today falls in, or null when the program carries no dates. */
export function findTodayWeekIndex(program: any, options: NormalizeOptions): number | null {
  const total = weekCountOf(program);
  for (let i = 0; i < total; i += 1) {
    if (buildWeek(program, i, options).workouts.some((w) => w.state === "today")) return i;
  }
  return null;
}
