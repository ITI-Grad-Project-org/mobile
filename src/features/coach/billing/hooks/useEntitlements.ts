import { useGetMyBillingQuery } from "@/api/endpoints/billing.endpoints";
import type { SubscriptionPlan } from "@/api/types";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { useCallback } from "react";

import { usageLabel } from "../lib/format";

export interface Entitlements {
  /** EFFECTIVE plan — what the coach can do right now. Gate on this. */
  plan: SubscriptionPlan;
  /** Raw stored plan, which can still say 'studio' after expiry. Only ever for
   *  explaining WHY access dropped. */
  storedPlan: SubscriptionPlan;
  isPaid: boolean;
  expiresAt: string | null;
  activeClientCount: number;
  /** null means unlimited. */
  activeClientLimit: number | null;
  canAddActiveClient: boolean;
  aiPlanBuilderEnabled: boolean;
  /** "8 / 20 active clients" — ready to render. */
  usage: string;
  /** True once we have a real answer. Until then the UI must not lock anything:
   *  a spurious "limit reached" on a coach with room is worse than briefly
   *  showing an action the server would refuse. */
  isReady: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * The cheap entitlement read, for the places that gate on a limit rather than
 * sell a plan (Clients header, invite sheet, join-request card, profile row).
 * Reads GET /billing/me only — the plan catalogue is the Billing screen's job.
 *
 * Every gate here is convenience. The backend is the security boundary and
 * enforces the limit at ACTIVATION time, so each call site still handles a live
 * 403: cached entitlements go stale the moment a client accepts an invite.
 */
export function useEntitlements(): Entitlements {
  const { tenantId } = useActiveTenant();

  const billing = useGetMyBillingQuery(
    { tenantId: tenantId ?? "" },
    {
      skip: !tenantId,
      // A payment completes outside the app: the coach returns from the Paymob
      // browser on a foreground event, not a navigation. setupListeners is
      // wired to RN AppState in src/store.
      refetchOnFocus: true,
    }
  );

  const summary = billing.data;

  const refetch = useCallback(() => {
    if (!tenantId) return;
    billing.refetch();
    // The refetch identity is stable per query arg, so this only re-creates on
    // a tenant change — which is exactly when the cache changes too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  return {
    plan: summary?.plan ?? "free",
    storedPlan: summary?.storedPlan ?? "free",
    isPaid: summary?.isPaidSubscriptionActive ?? false,
    expiresAt: summary?.subscriptionExpiresAt ?? null,
    activeClientCount: summary?.activeClientCount ?? 0,
    activeClientLimit: summary?.activeClientLimit ?? null,
    // Optimistic until proven otherwise — see isReady.
    canAddActiveClient: summary?.canAddActiveClient ?? true,
    aiPlanBuilderEnabled: summary?.aiPlanBuilderEnabled ?? false,
    usage: usageLabel(summary?.activeClientCount ?? 0, summary?.activeClientLimit ?? null),
    isReady: Boolean(summary),
    isLoading: !tenantId || billing.isLoading,
    isFetching: billing.isFetching,
    isError: billing.isError,
    refetch,
  };
}
