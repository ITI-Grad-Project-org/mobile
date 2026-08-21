/**
 * Specialties, humanised and tinted.
 *
 * Two maps, one file, so no JSX ever decides how a specialty reads or what
 * colour it takes. The tint rule is the same one the plans list uses — mint =
 * nutrition, lilac = training (see plans/components/CategoryAvatar) — so a
 * client who has learned the colours on their plan reads these peripherally.
 */

export type SpecialtyDomain = "training" | "nutrition" | "general";

/**
 * The raw enum is never rendered. Anything missing here falls through to
 * humanise(), so a specialty the server adds tomorrow still reads as English
 * rather than as WEIGHT_LOSS.
 */
const LABELS: Record<string, string> = {
  strength: "Strength",
  hypertrophy: "Hypertrophy",
  endurance: "Endurance",
  weight_loss: "Weight loss",
  mobility: "Mobility",
  rehab: "Rehab",
  postpartum: "Postpartum",
  yoga: "Yoga",
  nutrition: "Nutrition",
  powerlifting: "Powerlifting",
  // Capitalised the way the sport spells itself, which is why this is a map
  // and not a title-case function.
  crossfit: "CrossFit",
  calisthenics: "Calisthenics",
  general_fitness: "General fitness",
  muscle_gain: "Muscle gain",
};

/**
 * Only the specialties that clearly belong to one side of the app get a tint.
 * Everything else stays outlined — a wrong colour is worse than no colour,
 * because the client has been taught these two mean something.
 */
const DOMAINS: Record<string, SpecialtyDomain> = {
  calisthenics: "training",
  crossfit: "training",
  strength: "training",
  powerlifting: "training",

  nutrition: "nutrition",
  weight_loss: "nutrition",
  muscle_gain: "nutrition",
};

/** `WEIGHT_LOSS` / `weight-loss` / `weight loss` all normalise to the same key. */
function normalize(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

/** Sentence-case fallback for an enum this file hasn't been taught yet. */
function humanise(key: string): string {
  const words = key.split("_").filter(Boolean).join(" ");
  if (!words) return "";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function specialtyLabel(raw: string): string {
  const key = normalize(raw);
  return LABELS[key] ?? humanise(key);
}

export function specialtyDomain(raw: string): SpecialtyDomain {
  return DOMAINS[normalize(raw)] ?? "general";
}

/** Chip fill/border/text per domain. General carries no fill at all. */
export const SPECIALTY_TINT: Record<SpecialtyDomain, string> = {
  training: "bg-lilac/16 border-lilac/30 text-lilac-ink",
  nutrition: "bg-mint/14 border-mint/28 text-mint-ink",
  general: "border-border text-muted-foreground",
};
