import { useCreateCheckoutMutation } from "@/api/endpoints/billing.endpoints";
import type { SubscriptionPlan } from "@/api/types";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useState } from "react";

import { savePendingCheckout } from "../lib/checkoutSession";
import { messageForBillingError } from "../lib/errors";

export type PaidPlan = Exclude<SubscriptionPlan, "free">;

export interface Checkout {
  /** The plan whose button is mid-flight, so only that row shows a spinner. */
  pendingPlan: PaidPlan | null;
  busy: boolean;
  error: string | null;
  clearError: () => void;
  start: (plan: PaidPlan) => Promise<void>;
}

/**
 * Buying or renewing a plan.
 *
 *   createCheckout -> save the attempt id -> hand off to Paymob -> poll on return
 *
 * The order matters. The id must be persisted BEFORE the app loses the
 * foreground, because Paymob's redirect goes to a WEB page and brings nothing
 * back into the app. That saved id is the only trusted handle on the payment.
 *
 * openBrowserAsync rather than openAuthSessionAsync: there is no app-scheme
 * redirect for the auth session to capture (the redirect target is configured
 * server-side as a vercel URL), and on iOS the auth session prepends a "…wants
 * to sign in" consent alert that reads wrong for a payment. The browser promise
 * resolves when the coach dismisses the sheet — which is a dismissal, not a
 * result, so we go straight to the polling screen either way.
 */
export function useCheckout(): Checkout {
  const { tenantId } = useActiveTenant();
  const [createCheckout] = useCreateCheckoutMutation();

  const [pendingPlan, setPendingPlan] = useState<PaidPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const start = useCallback(
    async (plan: PaidPlan) => {
      // The backend permits more than one pending attempt, so a double tap
      // would quietly create two. Guard here rather than trusting the button's
      // disabled state.
      if (pendingPlan || !tenantId) return;

      setPendingPlan(plan);
      setError(null);

      try {
        // Body is ONLY { plan }. The backend owns price, currency, duration and
        // tenant, and rejects unknown fields.
        const checkout = await createCheckout({
          tenantId,
          body: { plan },
        }).unwrap();

        await savePendingCheckout({
          paymentAttemptId: checkout.paymentAttemptId,
          tenantId,
          plan,
          createdAt: new Date().toISOString(),
        });

        // Used exactly as returned: never parsed, rebuilt, appended to, or
        // logged (it carries Paymob client secrets in its query string).
        await WebBrowser.openBrowserAsync(checkout.checkoutUrl);

        router.push({
          pathname: "/(coach)/billing/result",
          params: { id: checkout.paymentAttemptId },
        });
      } catch (err: any) {
        // No redirect and no local subscription change. On a 502 the backend
        // already marked its attempt failed; a retry creates a fresh one.
        setError(messageForBillingError(err));
      } finally {
        setPendingPlan(null);
      }
    },
    [createCheckout, pendingPlan, tenantId]
  );

  return {
    pendingPlan,
    busy: pendingPlan !== null,
    error,
    clearError,
    start,
  };
}
