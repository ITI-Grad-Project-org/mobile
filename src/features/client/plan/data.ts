import type { IconName } from "@/shared/ui/Icon";
import type { ToneName } from "@/tw/Tone";

export type DayExercise = {
  id?: string;
  name: string;
  sets: number | string;
  reps?: string;
  weight?: string;
  muscle?: string;
  image: string;
  instructions?: string[];
};

export type DayPlan = {
  id?: string;
  d: string;
  date: number;
  title: string;
  tone: ToneName;
  mins: number;
  type: string;
  icon: IconName;
  desc: string;
  exercises: DayExercise[];
  notes?: string;
  logState?: string;
  isCompleted?: boolean;
  isSkipped?: boolean;
  /** Today's scheduled day — highlighted in the plan list. */
  isToday?: boolean;
};

/** Static class names per tone — NativeWind can only see literal classes, so no
 *  dynamic `text-${tone}-ink` strings. `primary`/`ink` fall back to semantic tokens. */
export const TONE_INK: Record<ToneName, string> = {
  sky: "text-sky-ink",
  lilac: "text-lilac-ink",
  mint: "text-mint-ink",
  peach: "text-peach-ink",
  sun: "text-sun-ink",
  primary: "text-primary",
  ink: "text-foreground",
};

/** Icon tint per tone. Light gradients use the tone's `-ink`; the dark `ink`/
 *  `primary` gradients use white for contrast. Passed to `<Icon color>`. */
export const TONE_ICON_COLOR: Record<ToneName, string> = {
  sky: "--sky-ink",
  lilac: "--lilac-ink",
  mint: "--mint-ink",
  peach: "--peach-ink",
  sun: "--sun-ink",
  primary: "#ffffff",
  ink: "#ffffff",
};

/** Text color for content sitting directly ON a tone gradient. Light tones use
 *  their saturated `-ink`; the dark `ink`/`primary` gradients use white. */
export const TONE_ON: Record<ToneName, string> = {
  sky: "text-sky-ink",
  lilac: "text-lilac-ink",
  mint: "text-mint-ink",
  peach: "text-peach-ink",
  sun: "text-sun-ink",
  primary: "text-white",
  ink: "text-white",
};
