import {
  exercises as strengthExercises,
  yogaExercises,
  enduranceExercises,
  type Exercise,
} from "@/lib/data";
import type { IconName } from "@/shared/ui/Icon";
import type { ToneName } from "@/tw/Tone";

export type DayExercise = { name: string; sets: string; image: string };

export type DayPlan = {
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

export const PLAN_HEADER: Record<string, { title: string; subtitle: string }> = {
  strength: { title: "Your plan", subtitle: "12-week hypertrophy + recomp" },
  yoga: { title: "Your plan", subtitle: "8-week vinyasa & mobility" },
  endurance: { title: "Your plan", subtitle: "10-week endurance build" },
  weightloss: { title: "Your plan", subtitle: "12-week fat-loss conditioning" },
};

export function buildWeek(planType: string): DayPlan[] {
  const exs: Exercise[] =
    planType === "yoga"
      ? yogaExercises
      : planType === "endurance"
        ? enduranceExercises
        : strengthExercises;

  const map = (n: number) => exs[n % exs.length];
  const toEx = (e: Exercise, sets?: string): DayExercise => ({
    name: e.name,
    sets: sets || `${e.sets} × ${e.reps}`,
    image: e.image,
  });

  if (planType === "yoga") {
    return [
      { d: "Sun", date: 20, title: "Restorative flow", tone: "sky", mins: 30, type: "Recovery", icon: "waves", desc: "Slow, breath-led stretches to reset the nervous system.", exercises: [toEx(map(4)), toEx(map(2))] },
      { d: "Mon", date: 21, title: "Sun Salutations", tone: "lilac", mins: 40, type: "Vinyasa", icon: "sparkles", desc: "Full-body flow to build heat and mobility.", exercises: [toEx(map(0)), toEx(map(1))] },
      { d: "Tue", date: 22, title: "Hip mobility", tone: "mint", mins: 35, type: "Mobility", icon: "wind", desc: "Deep hip openers and range-of-motion drills.", exercises: [toEx(map(2)), toEx(map(4))] },
      { d: "Wed", date: 23, title: "Backbends", tone: "peach", mins: 45, type: "Strength", icon: "activity", desc: "Progressive backbends to unlock the spine.", exercises: [toEx(map(3)), toEx(map(1))] },
      { d: "Thu", date: 24, title: "Yin & breath", tone: "sun", mins: 40, type: "Yin", icon: "wind", desc: "Long-hold postures with pranayama focus.", exercises: [toEx(map(4)), toEx(map(2))] },
      { d: "Fri", date: 25, title: "Power vinyasa", tone: "primary", mins: 50, type: "Today", icon: "flame", desc: "Your peak flow — dynamic, strong, sweat-worthy.", exercises: exs.map((e) => toEx(e)), notes: "Your big flow of the week." },
      { d: "Sat", date: 26, title: "Yoga + meditation", tone: "ink", mins: 55, type: "Mind", icon: "moon", desc: "Grounding practice with a guided meditation close.", exercises: [toEx(map(0)), toEx(map(4))] },
    ];
  }
  if (planType === "endurance") {
    return [
      { d: "Sun", date: 20, title: "Easy recovery jog", tone: "sky", mins: 30, type: "Recovery", icon: "wind", desc: "Conversational pace to promote blood flow.", exercises: [toEx(map(0), "30 min easy")] },
      { d: "Mon", date: 21, title: "Tempo intervals", tone: "lilac", mins: 45, type: "Threshold", icon: "activity", desc: "Sustained efforts at threshold pace with short rests.", exercises: [toEx(map(1)), toEx(map(2))] },
      { d: "Tue", date: 22, title: "Core + mobility", tone: "mint", mins: 30, type: "Strength", icon: "layers", desc: "Runner-focused core stability and hip work.", exercises: [toEx(map(2))] },
      { d: "Wed", date: 23, title: "Zone 2 run", tone: "peach", mins: 50, type: "Aerobic", icon: "heart", desc: "Aerobic base — low heart rate, steady breath.", exercises: [toEx(map(0), "50 min @ Z2")] },
      { d: "Thu", date: 24, title: "Hill repeats", tone: "sun", mins: 40, type: "Power", icon: "flame", desc: "Short, hard climbs to build leg power.", exercises: [toEx(map(1))] },
      { d: "Fri", date: 25, title: "Tempo + core", tone: "primary", mins: 55, type: "Today", icon: "flame", desc: "Key tempo session followed by a core finisher.", exercises: exs.map((e) => toEx(e)), notes: "Push the tempo block — controlled effort." },
      { d: "Sat", date: 26, title: "Long run", tone: "ink", mins: 80, type: "Endurance", icon: "heart", desc: "Weekly long run — steady, patient, aerobic.", exercises: [toEx(map(0), "75 min steady")] },
    ];
  }

  // strength / weightloss default
  return [
    {
      d: "Sun", date: 20, title: "Rest & mobility", tone: "sky", mins: 20, type: "Recovery", icon: "waves",
      desc: "Focus on movement quality and recovery.",
      exercises: [
        { name: "Foam roll lower body", sets: "10 min", image: strengthExercises[4].image },
        { name: "Hip CARs", sets: "2 × 8 / side", image: strengthExercises[2].image },
        { name: "Cat-cow flow", sets: "3 × 10", image: strengthExercises[1].image },
      ],
      notes: "Easy day — keep heart rate low and breathing nasal.",
    },
    {
      d: "Mon", date: 21, title: "Upper push", tone: "lilac", mins: 55, type: "Strength", icon: "dumbbell",
      desc: "Build upper-body pushing strength.",
      exercises: [
        { name: "Bench Press", sets: "4 × 6 @ 80 kg", image: strengthExercises[0].image },
        { name: "Overhead Press", sets: "3 × 8 @ 45 kg", image: strengthExercises[3].image },
        { name: "Dips", sets: "3 × 10", image: strengthExercises[2].image },
        { name: "Tricep pushdown", sets: "3 × 12", image: strengthExercises[4].image },
      ],
    },
    {
      d: "Tue", date: 22, title: "Zone 2 cardio", tone: "mint", mins: 45, type: "Cardio", icon: "heart",
      desc: "Low-intensity cardio to build endurance.",
      exercises: [
        { name: "Treadmill Z2", sets: "40 min @ 140 bpm", image: strengthExercises[1].image },
        { name: "Core finisher", sets: "3 × 45 sec plank", image: strengthExercises[2].image },
      ],
    },
    {
      d: "Wed", date: 23, title: "Upper pull", tone: "peach", mins: 55, type: "Strength", icon: "dumbbell",
      desc: "Vertical + horizontal pulling for a bigger back.",
      exercises: [
        { name: "Pull-ups", sets: "4 × 6", image: strengthExercises[3].image },
        { name: "Barbell row", sets: "3 × 8", image: strengthExercises[1].image },
        { name: "Face pulls", sets: "3 × 15", image: strengthExercises[4].image },
      ],
    },
    {
      d: "Thu", date: 24, title: "Conditioning", tone: "sun", mins: 35, type: "HIIT", icon: "flame",
      desc: "Short, hard intervals to spike the engine.",
      exercises: [
        { name: "Assault bike intervals", sets: "10 × 30s / 30s", image: strengthExercises[0].image },
        { name: "KB swings", sets: "5 × 15", image: strengthExercises[2].image },
      ],
    },
    {
      d: "Fri", date: 25, title: planType === "weightloss" ? "Full-body burn" : "Quad strength", tone: "primary", mins: 55, type: "Today", icon: "flame",
      desc: "Your biggest session of the week — bring it.",
      exercises: strengthExercises.map((e) => toEx(e)),
      notes: "Your big session of the week — bring it.",
    },
    {
      d: "Sat", date: 26, title: "Long run", tone: "ink", mins: 70, type: "Cardio", icon: "heart",
      desc: "Aerobic long piece at conversational pace.",
      exercises: [
        { name: "Easy long run", sets: "60 min", image: strengthExercises[1].image },
        { name: "Cooldown stretch", sets: "10 min", image: strengthExercises[4].image },
      ],
    },
  ];
}
