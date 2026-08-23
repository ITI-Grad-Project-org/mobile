/**
 * Calorie-share maths for the daily target card.
 *
 * A macro split is read as energy, not mass: 380g of carbs and 380g of fat are
 * nowhere near the same slice of the day, so segments are flexed by kcal
 * (carbs and protein at 4/g, fat at 9/g) rather than grams.
 */

export type MacroKey = "carbs" | "protein" | "fat";

export interface MacroSlice {
  key: MacroKey;
  label: string;
  grams: number;
  kcal: number;
  /** Whole-number share of macro calories; the three always sum to 100. */
  percent: number;
  /** Segment fill class — three steps of the mint ramp, darkest last. */
  fillClassName: string;
}

const KCAL_PER_GRAM: Record<MacroKey, number> = { carbs: 4, protein: 4, fat: 9 };

const SLICES: { key: MacroKey; label: string; fillClassName: string }[] = [
  { key: "carbs", label: "carbs", fillClassName: "bg-mint" },
  { key: "protein", label: "protein", fillClassName: "bg-mint-600" },
  { key: "fat", label: "fat", fillClassName: "bg-mint-800" },
];

/** A targets bag as the plan endpoints return it. */
export interface MacroTargets {
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  fiberG?: number | null;
  waterMl?: number | null;
}

function grams(targets: MacroTargets | null | undefined, key: MacroKey): number | null {
  const field = key === "carbs" ? "carbsG" : key === "protein" ? "proteinG" : "fatG";
  const value = targets?.[field];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * The macro slices a plan prescribes, or an empty list when it prescribes none
 * — a kcal-only plan has no split to draw.
 */
export function macroSplit(targets: MacroTargets | null | undefined): MacroSlice[] {
  const present = SLICES.map((slice) => {
    const g = grams(targets, slice.key);
    return g === null ? null : { ...slice, grams: g, kcal: g * KCAL_PER_GRAM[slice.key] };
  }).filter((slice): slice is Omit<MacroSlice, "percent"> => slice !== null);

  const total = present.reduce((sum, slice) => sum + slice.kcal, 0);
  if (present.length === 0 || total <= 0) return [];

  // Largest-remainder rounding, so the labels add up to exactly 100%.
  const exact = present.map((slice) => (slice.kcal / total) * 100);
  const floors = exact.map(Math.floor);
  let remainder = 100 - floors.reduce((sum, value) => sum + value, 0);

  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  const percents = [...floors];
  for (const { index } of order) {
    if (remainder <= 0) break;
    percents[index] += 1;
    remainder -= 1;
  }

  return present.map((slice, index) => ({ ...slice, percent: percents[index] }));
}

/**
 * Calories against maintenance, when the payload carries a TDEE. Neither plan
 * DTO documents one, so it's read defensively and simply absent otherwise.
 */
export function energyBalance(
  calories: number | null | undefined,
  tdee: number | null | undefined
): { delta: number; label: string } | null {
  if (typeof calories !== "number" || typeof tdee !== "number" || tdee <= 0) return null;

  const delta = Math.round(calories - tdee);
  if (delta === 0) return { delta, label: "at maintenance" };

  const sign = delta > 0 ? "+" : "−";
  return {
    delta,
    label: `${sign}${Math.abs(delta).toLocaleString()} ${delta > 0 ? "surplus" : "deficit"}`,
  };
}

/** TDEE from wherever the payload happens to keep it. */
export function tdeeOf(plan: any): number | null {
  const candidates = [
    plan?.tdee,
    plan?.targets?.tdee,
    plan?.clientDietaryProfile?.tdee,
    plan?.clientDietaryProfile?.maintenanceCalories,
  ];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  }
  return null;
}
