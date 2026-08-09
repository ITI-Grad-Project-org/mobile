import { addIsoDays } from "@/shared/utils/date";
import type {
  MealOutcome,
  MealSlot,
  NutritionTargets,
  ServingUnit,
} from "@/api/types";

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

/** Display order for meal slots — matches how a day is eaten, not the enum order. */
export const MEAL_SLOTS: readonly MealSlot[] = [
  "breakfast",
  "pre_workout",
  "lunch",
  "post_workout",
  "snack",
  "dinner",
] as const;

export const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  pre_workout: "Pre-workout",
  lunch: "Lunch",
  post_workout: "Post-workout",
  snack: "Snack",
  dinner: "Dinner",
};

export const OUTCOME_LABEL: Record<MealOutcome, string> = {
  completed: "Ate it",
  partial: "Partly",
  skipped: "Skipped",
};

// ---------------------------------------------------------------------------
// Normalized shapes
// ---------------------------------------------------------------------------

export interface Macros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

export interface PlannedMeal {
  /** The planned meal's own id — stable across the plan. */
  id: string;
  /** The id to PATCH an outcome against; only present once a log exists. */
  loggedMealId: string | null;
  name: string;
  slot: MealSlot;
  suggestedTime: string | null;
  coachNotes: string | null;
  photoUrl: string | null;
  outcome: MealOutcome | null;
  macros: Macros;
  items: MealItem[];
}

/** One ingredient line: "Oats" with "80 g" set apart. */
export interface MealItem {
  name: string;
  /** Pre-formatted for display, e.g. "80 g". */
  amount: string | null;
  /** The tenant Food this line came from — library mode needs it to log the line. */
  foodId: string | null;
  /** The prescribed quantity, in the Food's own serving unit. */
  quantity: number | null;
  /** The prescribed nutrients, so a line with no `foodId` can still be logged manually. */
  macros: Macros;
}

export interface LoggedFood {
  id: string;
  /** Set when the entry came from the coach's library — its macros are server-derived. */
  foodId: string | null;
  /** The prescribed meal this entry was logged against, when it was logged from one. */
  loggedMealId: string | null;
  name: string;
  brand: string | null;
  mealSlot: MealSlot;
  amount: number | null;
  servingUnit: ServingUnit | null;
  macros: Macros;
}

export interface NutritionDay {
  id: string;
  /** YYYY-MM-DD, or null when the payload carries no date. */
  date: string | null;
  dayNumber: number;
  weekNumber: number;
  isToday: boolean;
  isFlexibleDay: boolean;
  isRestDay: boolean;
  notes: string | null;
  targets: NutritionTargets;
  meals: PlannedMeal[];
  /** "completed" | "skipped" | "in_progress" | "pending", as the API spells it. */
  status: string | null;
}

export interface NutritionLog {
  id: string;
  isFinalized: boolean;
  waterMlConsumed: number;
  clientNotes: string | null;
  meals: PlannedMeal[];
  foods: LoggedFood[];
}

// ---------------------------------------------------------------------------
// Readers
// ---------------------------------------------------------------------------

/** Unwrap the `{ data: … }` envelope the API sometimes uses and sometimes doesn't. */
export function unwrap<T = any>(payload: any): T {
  return (payload?.data ?? payload) as T;
}

export function unwrapList(payload: any): any[] {
  const value = unwrap(payload);
  return Array.isArray(value) ? value : [];
}

const num = (...candidates: any[]): number => {
  for (const c of candidates) {
    const n = typeof c === "string" ? Number(c) : c;
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  return 0;
};

const str = (...candidates: any[]): string | null => {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }
  return null;
};

/** Trim an ISO timestamp down to its YYYY-MM-DD date part. */
export function isoDate(value: any): string | null {
  const s = str(value);
  return s ? s.split("T")[0] : null;
}

export const EMPTY_MACROS: Macros = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: 0,
};

const NUTRIENT_KEYS = [
  "calories",
  "totalCalories",
  "kcal",
  "proteinG",
  "totalProteinG",
  "protein",
] as const;

function hasNutrients(raw: any): boolean {
  if (!raw || typeof raw !== "object") return false;
  return NUTRIENT_KEYS.some((key) => raw[key] !== undefined && raw[key] !== null);
}

/**
 * Nutrients live in a nested bag whose name depends on the endpoint — `totals`
 * on a planned meal, `prescribedTotals`/`actualTotals` on a logged one,
 * `nutrients` on a food. The first candidate that actually carries numbers wins.
 */
function readMacros(...candidates: any[]): Macros {
  const raw = candidates.find(hasNutrients);
  if (!raw) return EMPTY_MACROS;
  return {
    calories: num(raw.calories, raw.totalCalories, raw.kcal),
    proteinG: num(raw.proteinG, raw.totalProteinG, raw.protein),
    carbsG: num(raw.carbsG, raw.totalCarbsG, raw.carbs),
    fatG: num(raw.fatG, raw.totalFatG, raw.fat),
    fiberG: num(raw.fiberG, raw.totalFiberG, raw.fiber),
  };
}

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    calories: a.calories + b.calories,
    proteinG: a.proteinG + b.proteinG,
    carbsG: a.carbsG + b.carbsG,
    fatG: a.fatG + b.fatG,
    fiberG: a.fiberG + b.fiberG,
  };
}

function readSlot(...candidates: any[]): MealSlot {
  for (const c of candidates) {
    if (typeof c === "string" && (MEAL_SLOTS as readonly string[]).includes(c)) {
      return c as MealSlot;
    }
  }
  return "snack";
}

function readOutcome(raw: any): MealOutcome | null {
  const value = raw?.outcome ?? raw?.status;
  return value === "completed" || value === "partial" || value === "skipped"
    ? value
    : null;
}

/**
 * Targets, with the day's per-field overrides winning over the plan's baseline.
 * A `0` override is meaningful for carbs/fiber, so only `null`/`undefined` fall through.
 *
 * Plans serve their baseline nested and unprefixed (`targets.calories`), while
 * days carry flat `…Override` keys — both spellings are read at each level.
 */
export function resolveTargets(day: any, plan: any): NutritionTargets {
  const pick = (
    overrideKey: string,
    planKey: keyof NutritionTargets,
    nestedKey: string
  ) => {
    const candidates = [
      day?.[overrideKey],
      day?.targetOverrides?.[nestedKey],
      // Already the plan baseline with the day's overrides applied.
      day?.effectiveTargets?.[nestedKey],
      day?.[planKey],
      day?.targets?.[nestedKey],
      day?.targets?.[planKey],
      plan?.[planKey],
      plan?.targets?.[nestedKey],
      plan?.targets?.[planKey],
    ];
    for (const value of candidates) {
      if (value === undefined || value === null) continue;
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return undefined;
  };

  return {
    targetCalories: pick("targetCaloriesOverride", "targetCalories", "calories"),
    targetProteinG: pick("targetProteinGOverride", "targetProteinG", "proteinG"),
    targetCarbsG: pick("targetCarbsGOverride", "targetCarbsG", "carbsG"),
    targetFatG: pick("targetFatGOverride", "targetFatG", "fatG"),
    targetFiberG: pick("targetFiberGOverride", "targetFiberG", "fiberG"),
    targetWaterMl: pick("targetWaterMlOverride", "targetWaterMl", "waterMl"),
  };
}

/**
 * The plan covering today. The list is not ordered by relevance — it mixes an
 * `active` plan with `scheduled` ones that start later — so `plans[0]` is often
 * the wrong plan to summarize.
 */
export function pickActivePlan(plans: any[], todayIsoDate: string): any | null {
  if (plans.length === 0) return null;

  const active = plans.find((plan) => plan?.schedulePhase === "active");
  if (active) return active;

  const covering = plans.find((plan) => {
    const start = isoDate(plan?.startDate);
    const end = isoDate(plan?.endDate);
    return !!start && start <= todayIsoDate && (!end || end >= todayIsoDate);
  });
  if (covering) return covering;

  // Nothing covers today — show the soonest upcoming plan over an expired one.
  const upcoming = plans
    .filter((plan) => {
      const start = isoDate(plan?.startDate);
      return !!start && start > todayIsoDate;
    })
    .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));

  return upcoming[0] ?? plans[0];
}

/** Every day in a plan, in order, whatever shape the plan came in. */
export function planDayList(plan: any): any[] {
  const weeks = Array.isArray(plan?.weeks) ? plan.weeks : [];
  if (weeks.length > 0) {
    return weeks.flatMap((week: any) =>
      (Array.isArray(week?.days) ? week.days : []).map((day: any) => ({
        ...day,
        weekNumber: day?.weekNumber ?? week?.weekNumber ?? week?.position,
      }))
    );
  }
  const days = plan?.days || plan?.nutritionDays || plan?.planDays;
  return Array.isArray(days) ? days : [];
}

/**
 * A plan day's calendar date, derived from the plan's start when the day itself
 * carries none — plan days are relative to the start, so without this "which day
 * is today" hangs entirely off a calendar row, and today's targets blank out the
 * moment that row stops naming the day (e.g. once it's finished).
 */
export function planDayDate(plan: any, day: any): string | null {
  const start = isoDate(plan?.startDate);
  if (!start) return null;

  const dayNumber = num(day?.dayNumber, day?.position);
  if (dayNumber <= 0) return null;

  // `dayNumber` is 1–7 inside its week when the plan is served as weeks; some
  // payloads number days across the whole plan instead, where the week is
  // already baked in and must not be added twice.
  const weekNumber = num(day?.weekNumber) || 1;
  const offset = dayNumber > 7 ? dayNumber - 1 : (weekNumber - 1) * 7 + (dayNumber - 1);

  return addIsoDays(start, offset);
}

function normalizeItems(raw: any): MealItem[] {
  const items: any[] =
    raw?.plannedFoods ||
    raw?.foods ||
    raw?.items ||
    raw?.plannedMealFoods ||
    raw?.ingredients ||
    [];
  if (!Array.isArray(items)) return [];
  return items
    .map((item: any) => {
      const name = str(item?.foodName, item?.food?.name, item?.name);
      if (!name) return null;
      const amount = item?.amount ?? item?.servingSize;
      const unit = str(item?.food?.servingUnit, item?.servingUnit);
      return {
        name,
        amount: amount ? `${amount}${unit ? ` ${unit}` : ""}` : null,
        foodId: str(item?.sourceFoodId, item?.foodId, item?.food?.id),
        quantity: typeof amount === "number" && amount > 0 ? amount : null,
        macros: readMacros(item?.nutrients, item),
      };
    })
    .filter((item): item is MealItem => item !== null);
}

export function normalizeMeal(raw: any, index: number): PlannedMeal {
  // A logged meal is flat and points back at its planned meal by id; other
  // shapes nest the planned meal under `plannedMeal`/`meal`.
  const source = raw?.plannedMeal || raw?.meal || raw;
  // Only a logged meal can take an outcome — `plannedMealId` is what marks one.
  const isLogged = raw?.plannedMealId !== undefined || raw?.outcome !== undefined;

  return {
    id: str(raw?.plannedMealId, source?.id, raw?.id) ?? `meal-${index}`,
    loggedMealId: str(raw?.loggedMealId, isLogged ? raw?.id : null),
    name:
      str(source?.mealName, raw?.mealName, source?.name, source?.meal?.name, raw?.name) ??
      `Meal ${index + 1}`,
    slot: readSlot(raw?.slot, raw?.mealSlot, source?.slot, source?.mealSlot),
    suggestedTime: str(source?.suggestedTime, raw?.suggestedTime),
    coachNotes: str(
      source?.coachNotes,
      raw?.coachNotes,
      source?.prepNotes,
      source?.description
    ),
    photoUrl: str(source?.photoUrl, source?.meal?.photoUrl, raw?.photoUrl),
    outcome: readOutcome(raw),
    // Always the prescription, never what was eaten — the food logs carry that.
    macros: readMacros(raw?.prescribedTotals, source?.totals, raw?.totals, source, raw),
    items: normalizeItems(isLogged ? raw : source),
  };
}

/**
 * A logged meal carries the outcome but only a thin copy of the prescription —
 * no photo, suggested time or coach note — so fold the planned meal back in.
 * They line up on `id`, which is the planned meal's id on both sides.
 */
export function mergeMeals(planned: PlannedMeal[], logged: PlannedMeal[]): PlannedMeal[] {
  if (logged.length === 0) return planned;

  const byId = new Map(planned.map((meal) => [meal.id, meal]));
  return logged.map((meal) => {
    const prescription = byId.get(meal.id);
    if (!prescription) return meal;
    return {
      ...meal,
      name: meal.name || prescription.name,
      suggestedTime: meal.suggestedTime ?? prescription.suggestedTime,
      coachNotes: meal.coachNotes ?? prescription.coachNotes,
      photoUrl: meal.photoUrl ?? prescription.photoUrl,
      macros: meal.macros.calories > 0 ? meal.macros : prescription.macros,
      items: meal.items.length > 0 ? meal.items : prescription.items,
    };
  });
}

export function normalizeFood(raw: any, index: number): LoggedFood {
  const servingUnit = str(raw?.servingUnit, raw?.food?.servingUnit);
  return {
    id: str(raw?.id) ?? `food-${index}`,
    foodId: str(raw?.foodId, raw?.food?.id),
    loggedMealId: str(raw?.loggedMealId),
    name: str(raw?.foodName, raw?.food?.name, raw?.name) ?? "Food",
    brand: str(raw?.brand, raw?.food?.brand),
    mealSlot: readSlot(raw?.mealSlot, raw?.slot),
    amount: typeof raw?.amount === "number" ? raw.amount : null,
    servingUnit: (servingUnit as ServingUnit | null) ?? null,
    macros: readMacros(raw?.nutrients, raw),
  };
}

/** The nutrition day a calendar row points at, however the row spells it. */
export function calendarDayId(row: any): string | null {
  if (!row) return null;
  return (
    str(row.id, row.dayId, row.nutritionDayId, row.nutritionDay?.id, row.day?.id) ?? null
  );
}

/**
 * A day log's id, wherever the payload hides it — a calendar row, a day fetched
 * directly, or the log itself. Reading it from what's already loaded is what
 * keeps a FINISHED day's history on screen: `startOrResume` refuses a finalized
 * day, so the POST response can't be the only way to find the log.
 */
export function readLogId(raw: any): string | null {
  const source = unwrap(raw);
  if (!source || typeof source !== "object") return null;

  // Calendar rows wrap the day; a day fetched directly is already the day.
  const day = source.nutritionDay || source.day || source;
  const list = [source.logs, source.nutritionLogs, day?.logs].find(Array.isArray);

  return str(
    source.nutritionLog?.id,
    source.log?.id,
    source.logId,
    source.nutritionLogId,
    source.nutritionDayLog?.id,
    source.dayLog?.id,
    day?.nutritionLog?.id,
    day?.log?.id,
    day?.logId,
    day?.nutritionDayLog?.id,
    day?.dayLog?.id,
    list?.[0]?.id
  );
}

/** The row's log, present only once the client has started one. */
export function calendarLogId(row: any): string | null {
  return readLogId(row);
}

/**
 * A finished or skipped day. It can still be READ — it just can't be written to,
 * so nothing should try to (re)open a log for it.
 */
export function isDayClosed(status: string | null | undefined): boolean {
  return status === "completed" || status === "skipped" || status === "finalized";
}

/**
 * `todayDayId` comes from the calendar. Plan payloads often carry no dates at
 * all — days are relative to the plan's start — so matching on the date alone
 * would never mark today.
 */
export function normalizeDay(
  raw: any,
  plan: any,
  todayIsoDate: string,
  todayDayId?: string | null
): NutritionDay | null {
  const source = unwrap(raw);
  if (!source) return null;

  // Calendar rows wrap the day; a day fetched directly is already the day.
  const day = source?.nutritionDay || source?.day || source;
  const id = str(day?.id, source?.dayId, source?.nutritionDayId);
  if (!id) return null;

  const date =
    isoDate(day?.date ?? day?.scheduledDate ?? source?.date ?? source?.scheduledDate) ??
    planDayDate(plan, day);
  const rawMeals: any[] =
    day?.meals || day?.plannedMeals || day?.prescribedMeals || source?.meals || [];

  return {
    id,
    date,
    dayNumber: num(day?.dayNumber, day?.position, source?.dayNumber) || 0,
    weekNumber: num(day?.weekNumber, source?.weekNumber) || 1,
    isToday: (date !== null && date === todayIsoDate) || (!!todayDayId && id === todayDayId),
    isFlexibleDay: Boolean(day?.isFlexibleDay ?? source?.isFlexibleDay),
    isRestDay: Boolean(day?.isRestDay),
    notes: str(day?.notes, source?.notes),
    targets: resolveTargets(day, plan),
    meals: Array.isArray(rawMeals) ? rawMeals.map(normalizeMeal) : [],
    // `logState` is how the API reports where the day stands ("completed",
    // "skipped", "in_progress", "not_started").
    status: str(day?.logState, source?.logState, source?.status, source?.logStatus, day?.status),
  };
}

export function normalizeLog(raw: any): NutritionLog | null {
  const log = unwrap(raw);
  const id = str(log?.id);
  if (!id) return null;

  const rawMeals: any[] = log?.loggedMeals || log?.meals || [];
  const rawFoods: any[] = log?.actualFoods || log?.foodLogs || log?.loggedFoods || log?.foods || [];

  return {
    id,
    // The API spells "finished" several ways depending on the endpoint;
    // `isWritable: false` closes the day for any other reason (retrospective
    // window elapsed, plan ended).
    isFinalized:
      log?.isWritable === false ||
      log?.status === "finalized" ||
      Boolean(log?.isFinalized ?? log?.completedAt ?? log?.finalizedAt ?? log?.finishedAt),
    waterMlConsumed: num(log?.waterMlConsumed, log?.waterMl),
    clientNotes: str(log?.clientNotes),
    meals: Array.isArray(rawMeals) ? rawMeals.map(normalizeMeal) : [],
    foods: Array.isArray(rawFoods) ? rawFoods.map(normalizeFood) : [],
  };
}

/**
 * What the client has actually consumed. A meal outcome records prescription
 * ADHERENCE only — the server never turns "ate it" into food entries — so the
 * totals come purely from the Food diary, with a server total winning when present.
 */
export function consumedMacros(log: NutritionLog | null, rawLog: any): Macros {
  const raw = unwrap(rawLog);
  if (hasNutrients(raw?.actualTotals)) return readMacros(raw.actualTotals);
  if (hasNutrients(raw?.totals)) return readMacros(raw.totals);
  if (!log) return EMPTY_MACROS;
  return log.foods.reduce((acc, food) => addMacros(acc, food.macros), EMPTY_MACROS);
}

/** Meals still awaiting an outcome — `completeNutritionLog` 409s while any remain. */
export function pendingMeals(log: NutritionLog | null): PlannedMeal[] {
  return (log?.meals ?? []).filter((meal) => meal.outcome === null);
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * A 409 is never a validation failure here. On the plan it means two published
 * plans cover today; on any log mutation it means the day is closed for editing.
 */
export function isConflict(error: any): boolean {
  return error?.status === 409 || error?.originalStatus === 409;
}

export function errorMessage(error: any, fallback: string): string {
  const message = error?.data?.message ?? error?.message;
  if (Array.isArray(message)) return message.join(", ");
  return typeof message === "string" && message ? message : fallback;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatKcal(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function formatGrams(value: number): string {
  return `${Math.round(value)}g`;
}

/** "Mon 14" for a day chip; falls back to the day number when there's no date. */
export function formatDayChip(day: NutritionDay): { weekday: string; dayOfMonth: string } {
  if (!day.date) {
    return { weekday: `D${day.dayNumber || 1}`, dayOfMonth: String(day.dayNumber || 1) };
  }
  const parts = day.date.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return { weekday: `D${day.dayNumber || 1}`, dayOfMonth: String(day.dayNumber || 1) };
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return {
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
    dayOfMonth: String(date.getDate()),
  };
}

/** "Today", or "Mon, 14 Apr", or "Day 3" when the payload carries no date. */
export function formatDayTitle(day: NutritionDay): string {
  if (day.isToday) return "Today";
  if (day.date) {
    const parts = day.date.split("-").map(Number);
    if (parts.length === 3 && !parts.some(Number.isNaN)) {
      return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    }
  }
  return `Day ${day.dayNumber || 1}`;
}

// ---------------------------------------------------------------------------
// Manual food-entry limits, from types.ts CreateActualFoodLogDto
// ---------------------------------------------------------------------------
export const MANUAL_LIMITS = {
  amount: 5000,
  calories: 5000,
  proteinG: 500,
  carbsG: 1000,
  fatG: 500,
  fiberG: 150,
} as const;
