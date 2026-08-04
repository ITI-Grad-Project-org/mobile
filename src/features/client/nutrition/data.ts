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
  /** Ingredient lines, pre-formatted for display ("Oats · 80 g"). */
  items: string[];
}

export interface LoggedFood {
  id: string;
  /** Set when the entry came from the coach's library — its macros are server-derived. */
  foodId: string | null;
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

function readMacros(raw: any): Macros {
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
 */
export function resolveTargets(day: any, plan: any): NutritionTargets {
  const pick = (dayKey: string, planKey: keyof NutritionTargets) => {
    const override = day?.[dayKey] ?? day?.[planKey];
    if (override !== undefined && override !== null) return Number(override);
    const base = plan?.[planKey];
    return base !== undefined && base !== null ? Number(base) : undefined;
  };

  return {
    targetCalories: pick("targetCaloriesOverride", "targetCalories"),
    targetProteinG: pick("targetProteinGOverride", "targetProteinG"),
    targetCarbsG: pick("targetCarbsGOverride", "targetCarbsG"),
    targetFatG: pick("targetFatGOverride", "targetFatG"),
    targetFiberG: pick("targetFiberGOverride", "targetFiberG"),
    targetWaterMl: pick("targetWaterMlOverride", "targetWaterMl"),
  };
}

function normalizeItems(raw: any): string[] {
  const items: any[] = raw?.items || raw?.foods || raw?.plannedMealFoods || raw?.ingredients || [];
  if (!Array.isArray(items)) return [];
  return items
    .map((item: any) => {
      const name = str(item?.food?.name, item?.name, item?.foodName);
      if (!name) return null;
      const amount = item?.amount ?? item?.servingSize;
      const unit = str(item?.food?.servingUnit, item?.servingUnit);
      return amount ? `${name} · ${amount}${unit ? ` ${unit}` : ""}` : name;
    })
    .filter((line): line is string => Boolean(line));
}

export function normalizeMeal(raw: any, index: number): PlannedMeal {
  // A logged meal wraps the planned one, so the display fields may sit one level
  // down under `plannedMeal`/`meal` — check the wrapper first, then the source.
  const source = raw?.plannedMeal || raw?.meal || raw;
  const macroSource =
    raw?.calories !== undefined ? raw : source?.calories !== undefined ? source : source?.meal;

  return {
    id: str(source?.id, raw?.plannedMealId, raw?.id) ?? `meal-${index}`,
    loggedMealId: str(raw?.loggedMealId, raw?.id),
    name: str(source?.name, source?.meal?.name, raw?.name) ?? `Meal ${index + 1}`,
    slot: readSlot(raw?.slot, raw?.mealSlot, source?.slot, source?.mealSlot),
    suggestedTime: str(source?.suggestedTime, raw?.suggestedTime),
    coachNotes: str(source?.coachNotes, raw?.coachNotes),
    photoUrl: str(source?.photoUrl, source?.meal?.photoUrl, raw?.photoUrl),
    outcome: readOutcome(raw),
    macros: readMacros(macroSource),
    items: normalizeItems(source),
  };
}

export function normalizeFood(raw: any, index: number): LoggedFood {
  const servingUnit = str(raw?.servingUnit, raw?.food?.servingUnit);
  return {
    id: str(raw?.id) ?? `food-${index}`,
    foodId: str(raw?.foodId, raw?.food?.id),
    name: str(raw?.foodName, raw?.food?.name, raw?.name) ?? "Food",
    brand: str(raw?.brand, raw?.food?.brand),
    mealSlot: readSlot(raw?.mealSlot, raw?.slot),
    amount: typeof raw?.amount === "number" ? raw.amount : null,
    servingUnit: (servingUnit as ServingUnit | null) ?? null,
    macros: readMacros(raw),
  };
}

export function normalizeDay(raw: any, plan: any, todayIsoDate: string): NutritionDay | null {
  const source = unwrap(raw);
  if (!source) return null;

  // Calendar rows wrap the day; a day fetched directly is already the day.
  const day = source?.nutritionDay || source?.day || source;
  const id = str(day?.id, source?.dayId, source?.nutritionDayId);
  if (!id) return null;

  const date = isoDate(day?.date ?? day?.scheduledDate ?? source?.date ?? source?.scheduledDate);
  const rawMeals: any[] =
    day?.meals || day?.plannedMeals || day?.prescribedMeals || source?.meals || [];

  return {
    id,
    date,
    dayNumber: num(day?.dayNumber, day?.position, source?.dayNumber) || 0,
    weekNumber: num(day?.weekNumber, source?.weekNumber) || 1,
    isToday: date !== null && date === todayIsoDate,
    isFlexibleDay: Boolean(day?.isFlexibleDay ?? source?.isFlexibleDay),
    isRestDay: Boolean(day?.isRestDay),
    notes: str(day?.notes, source?.notes),
    targets: resolveTargets(day, plan),
    meals: Array.isArray(rawMeals) ? rawMeals.map(normalizeMeal) : [],
    status: str(source?.status, source?.logStatus, day?.status),
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
    // The API spells "finished" several ways depending on the endpoint.
    isFinalized: Boolean(
      log?.isFinalized ?? log?.completedAt ?? log?.finalizedAt ?? log?.finishedAt
    ),
    waterMlConsumed: num(log?.waterMlConsumed, log?.waterMl),
    clientNotes: str(log?.clientNotes),
    meals: Array.isArray(rawMeals) ? rawMeals.map(normalizeMeal) : [],
    foods: Array.isArray(rawFoods) ? rawFoods.map(normalizeFood) : [],
  };
}

/**
 * What the client has actually consumed. Planned meals don't contribute on their
 * own — the server materializes a completed meal into food logs — so only the
 * food logs are summed, and a server-provided total wins when one is present.
 */
export function consumedMacros(log: NutritionLog | null, rawLog: any): Macros {
  const totals = unwrap(rawLog)?.totals;
  if (totals && typeof totals === "object") return readMacros(totals);
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
