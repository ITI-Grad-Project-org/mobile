/**
 * Weight unit for the live logging screen.
 *
 * The API stores weight in kilograms (`weightKg` everywhere in api/types.ts) and
 * the client profile does not yet expose a unit preference — so this resolves to
 * "kg" today. Everything unit-aware in the workout screen goes through here, so
 * wiring a real profile setting later is a one-line change.
 */
export type WeightUnit = "kg" | "lb";

const KG_PER_LB = 0.45359237;

/** Step size used by the weight stepper: 2.5 kg / 5 lb. */
export const WEIGHT_STEP: Record<WeightUnit, number> = { kg: 2.5, lb: 5 };

/**
 * The lowest weight the stepper will show, and where it starts when neither the
 * client nor the coach put a number on the set. One plate, not 0 — a set logged
 * at 0 kg isn't a real entry.
 */
export const MIN_WEIGHT: Record<WeightUnit, number> = { kg: 2.5, lb: 5 };

export function useWeightUnit(): WeightUnit {
  // TODO: read from the client profile once the API exposes a unit preference.
  return "kg";
}

/** kg (the storage unit) -> the display unit. */
export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === "kg" ? kg : kg / KG_PER_LB;
}

/** The display unit -> kg (the storage unit). */
export function toKg(value: number, unit: WeightUnit): number {
  return unit === "kg" ? value : value * KG_PER_LB;
}

/** Trims trailing zeroes so 60 reads "60" and 62.5 reads "62.5". */
export function formatWeight(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
