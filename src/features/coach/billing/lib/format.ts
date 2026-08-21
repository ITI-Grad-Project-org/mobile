import type { BillingPlan, SubscriptionPlan } from "@/api/types";
import { formatPrice } from "@/lib/money";

/**
 * A plan's name without loading the catalogue. The catalogue's `displayName` is
 * authoritative and should be preferred wherever plans are already fetched;
 * this is for the cheap entitlement-only call sites (a settings-row hint) that
 * shouldn't pull /billing/plans just to write one word.
 */
export function planDisplayName(plan: SubscriptionPlan): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

/**
 * A catalogue price. `priceCents` is in cents; formatPrice takes whole units,
 * and already falls back to "EGP 299" when Hermes ships without full ICU.
 */
export function formatPlanPrice(plan: BillingPlan): string {
  if (plan.priceCents === 0) return "Free";
  return formatPrice(plan.priceCents / 100, plan.currency);
}

/**
 * "8 / 20 active clients", or "21 active clients" when the limit is null.
 *
 * A null limit means UNLIMITED. Rendering it as 0, "—" or "unknown" is the
 * classic bug here and tells a Studio coach they have no room.
 */
export function usageLabel(count: number, limit: number | null): string {
  const plural = count === 1 ? "client" : "clients";
  if (limit === null) return `${count} active ${plural}`;
  return `${count} / ${limit} active ${plural}`;
}

/** The catalogue row's limit line. */
export function clientLimitLabel(limit: number | null): string {
  if (limit === null) return "Unlimited active clients";
  return `Up to ${limit} active client${limit === 1 ? "" : "s"}`;
}

/** "18 December 2026" — device locale, absolute date. Subscriptions are bought
 *  in 30-day blocks, so a relative "in 3 weeks" hides the date the coach
 *  actually needs. */
export function formatExpiry(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  try {
    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Short form for the settings-row hint: "Solo · 8 of 20 clients". */
export function planHint(
  displayName: string,
  count: number,
  limit: number | null
): string {
  const of = limit === null ? "unlimited" : String(limit);
  return `${displayName} · ${count} of ${of} clients`;
}
