import {
  useGetBillingPlansQuery,
  useGetMyBillingQuery,
} from "@/api/endpoints/billing.endpoints";
import type { BillingPlan, BillingSummary } from "@/api/types";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { useCallback, useMemo } from "react";

import { sortPlans } from "../lib/transitions";

export interface BillingData {
  /** Catalogue in display order (Free, Solo, Studio). Prices and limits render
   *  from here — nothing about them is hardcoded in the app. */
  plans: BillingPlan[];
  summary: BillingSummary | undefined;
  /** True when the tenant's paid plan lapsed: the stored plan still names a
   *  paid tier but the effective plan has fallen back to Free. */
  hasExpired: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetchAll: () => void;
}

/**
 * Everything the Billing screen renders: the plan catalogue plus this tenant's
 * effective plan, expiry, usage and entitlements.
 */
export function useBillingData(): BillingData {
  const { tenantId } = useActiveTenant();

  const catalogue = useGetBillingPlansQuery();
  const billing = useGetMyBillingQuery(
    { tenantId: tenantId ?? "" },
    { skip: !tenantId, refetchOnFocus: true }
  );

  const plans = useMemo(() => sortPlans(catalogue.data), [catalogue.data]);

  const summary = billing.data;
  const hasExpired = Boolean(
    summary && summary.plan === "free" && summary.storedPlan !== "free"
  );

  const refetchAll = useCallback(() => {
    catalogue.refetch();
    if (tenantId) billing.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  return {
    plans,
    summary,
    hasExpired,
    isLoading: !tenantId || catalogue.isLoading || billing.isLoading,
    isFetching: catalogue.isFetching || billing.isFetching,
    isError: catalogue.isError || billing.isError,
    refetchAll,
  };
}
