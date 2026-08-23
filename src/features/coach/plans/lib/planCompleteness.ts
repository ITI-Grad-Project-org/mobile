import type { CoachPlan } from "./normalizePlan";

export interface PlanStep {
  key: string;
  label: string;
  done: boolean;
}

export interface PlanCompleteness {
  completedSteps: number;
  totalSteps: number;
  /** "2 of 5 steps · macros missing" — the caption under the track. */
  caption: string;
  /** The step a "Continue" should land on, or null when nothing is missing. */
  nextStep: PlanStep | null;
}

function stepsFor(plan: CoachPlan, raw?: any): PlanStep[] {
  const hasDays =
    (Array.isArray(raw?.weeks) && raw.weeks.some((w: any) => (w?.days?.length ?? 0) > 0)) ||
    (Array.isArray(raw?.days) && raw.days.length > 0);

  const common: PlanStep[] = [
    { key: "name", label: "name", done: plan.name.trim().length > 0 },
    { key: "duration", label: "duration", done: plan.durationWeeks > 0 && !!plan.startDate },
    { key: "client", label: "client", done: Boolean(plan.membershipId) },
  ];

  if (plan.kind === "nutrition") {
    const targets = plan.targets;
    return [
      ...common,
      {
        key: "macros",
        label: "macros",
        done: Boolean(targets && targets.calories !== null && targets.proteinG !== null),
      },
      { key: "meals", label: "meals", done: hasDays },
    ];
  }

  return [
    ...common,
    { key: "goal", label: "goal", done: Boolean(plan.goal) },
    { key: "sessions", label: "sessions", done: hasDays },
  ];
}

export function planCompleteness(plan: CoachPlan, raw?: any): PlanCompleteness {
  const steps = stepsFor(plan, raw);
  const completedSteps = steps.filter((step) => step.done).length;
  const missing = steps.filter((step) => !step.done);

  const caption = [
    `${completedSteps} of ${steps.length} steps`,
    missing.length > 0 ? `${missing[0].label} missing` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    completedSteps,
    totalSteps: steps.length,
    caption,
    nextStep: missing[0] ?? null,
  };
}
