import type { BillingPlan, SubscriptionPlan } from "@/api/types";

export interface PlanCta {
  label: string;
  /** True when the action must not be offered at all. */
  hidden: boolean;
}

/**
 * What the button on a catalogue row should say, given the tenant's EFFECTIVE
 * plan. Always driven by `BillingSummary.plan`, never `storedPlan` — an expired
 * Studio tenant is a Free tenant and may buy either paid plan again.
 *
 * The one blocked transition is active Studio -> Solo: the backend answers 409
 * ("An active Studio subscription cannot be changed to Solo"). There is no
 * downgrade, proration or plan-change-at-expiry in V1.
 */
export function ctaForPlan(effective: SubscriptionPlan, target: SubscriptionPlan): PlanCta {
  // Free is the fallback state, never something a coach buys.
  if (target === "free") {
    return { label: "", hidden: true };
  }

  if (effective === "studio" && target === "solo") {
    return { label: "", hidden: true };
  }

  if (effective === target) {
    return { label: `Renew ${titleFor(target)} for 30 days`, hidden: false };
  }

  return { label: `Upgrade to ${titleFor(target)}`, hidden: false };
}

function titleFor(plan: SubscriptionPlan): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

/** The catalogue row matching a plan id. Rows are keyed by `plan`, never by
 *  array position — the endpoint makes no ordering promise. */
export function findPlan(
  plans: BillingPlan[] | undefined,
  plan: SubscriptionPlan
): BillingPlan | undefined {
  return (plans ?? []).find((row) => row.plan === plan);
}

/** Catalogue order for display: Free, Solo, Studio. */
const DISPLAY_ORDER: SubscriptionPlan[] = ["free", "solo", "studio"];

export function sortPlans(plans: BillingPlan[] | undefined): BillingPlan[] {
  return [...(plans ?? [])].sort(
    (a, b) => DISPLAY_ORDER.indexOf(a.plan) - DISPLAY_ORDER.indexOf(b.plan)
  );
}
