import { baseApi } from "@/api/baseApi";
import { useGetPaymentAttemptQuery } from "@/api/endpoints/billing.endpoints";
import type { PaymentAttempt } from "@/api/types";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { useAppDispatch } from "@/store";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  clearPendingCheckout,
  readPendingCheckout,
  type PendingCheckout,
} from "../lib/checkoutSession";
import { messageForBillingError } from "../lib/errors";

/** How often to ask the backend while the webhook is still in flight. */
const POLL_INTERVAL_MS = 1500;
/** Automatic polling stops here. Past it the coach drives with "Check again" —
 *  a webhook that is late is not a webhook that failed. */
const POLL_WINDOW_MS = 45_000;

export type CheckoutResultState =
  | "loading"
  | "pending"
  | "succeeded"
  | "failed"
  /** Still pending when automatic polling gave up. NOT a failure. */
  | "delayed"
  /** No attempt id in the route or in storage. */
  | "missing"
  /** The stored attempt belongs to a tenant the coach is no longer in. */
  | "tenant_mismatch"
  | "request_error";

export interface CheckoutResult {
  state: CheckoutResultState;
  attempt: PaymentAttempt | undefined;
  /** The tenant that started the checkout, when it isn't the active one. */
  startedInTenantId: string | null;
  errorMsg: string | null;
  /** Manual retry: resets the polling window and re-reads the backend. */
  checkAgain: () => void;
}

/**
 * Resolves what actually happened to a payment.
 *
 * The ONLY source of truth is GET /billing/payments/:id. The coach arrives here
 * after dismissing the Paymob browser, which proves nothing — not the
 * dismissal, not a Paymob success screen, not any `success=true` in the
 * redirect URL. The browser and the webhook are independent, and the browser
 * usually wins the race, so `pending` is the expected first answer.
 */
export function useCheckoutResult(routeAttemptId?: string): CheckoutResult {
  const { tenantId } = useActiveTenant();
  const dispatch = useAppDispatch();

  const [pending, setPending] = useState<PendingCheckout | null>(null);
  const [storageRead, setStorageRead] = useState(false);
  const [deadline, setDeadline] = useState(() => Date.now() + POLL_WINDOW_MS);
  const [windowClosed, setWindowClosed] = useState(false);
  const settled = useRef(false);

  // Recover the attempt saved before we left for Paymob. Covers the app being
  // killed while the coach was on the hosted page, and carries the tenant that
  // started the checkout.
  useEffect(() => {
    let alive = true;
    readPendingCheckout().then((stored) => {
      if (!alive) return;
      setPending(stored);
      setStorageRead(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // The route param wins when present; storage is the fallback.
  const attemptId = routeAttemptId || pending?.paymentAttemptId || null;
  const startedInTenantId = pending?.tenantId ?? null;

  // A stored attempt from another tenant would 404 here — the endpoint matches
  // on attempt id AND tenant. Detect it before asking, so the coach gets "switch
  // back to that business" instead of "not found".
  const tenantMismatch = Boolean(
    storageRead && tenantId && startedInTenantId && startedInTenantId !== tenantId
  );

  const canQuery = Boolean(tenantId && attemptId && !tenantMismatch);

  // Deliberately NOT part of `skip`: the query stays subscribed after polling
  // stops so "Check again" still has a query to refetch.
  const [terminal, setTerminal] = useState(false);

  const attemptQuery = useGetPaymentAttemptQuery(
    { tenantId: tenantId ?? "", paymentAttemptId: attemptId ?? "" },
    {
      skip: !canQuery,
      // 0 disables polling. Stop on a terminal answer or when the automatic
      // window closes; a 404 or network error keeps polling, since both are
      // routinely transient while the webhook is still in flight.
      pollingInterval: terminal || windowClosed ? 0 : POLL_INTERVAL_MS,
    }
  );

  const attempt = attemptQuery.data;
  const status = attempt?.status;
  const isTerminal = status === "succeeded" || status === "failed";

  // Close the automatic window on a timer rather than counting polls, so a slow
  // network can't stretch 30 polls across five minutes.
  useEffect(() => {
    if (windowClosed || isTerminal) return;

    // Always through a timer, even when the deadline has already passed: a
    // synchronous setState here would cascade renders. A 0ms timeout still
    // lands on the next tick.
    const remaining = Math.max(0, deadline - Date.now());
    const timer = setTimeout(() => setWindowClosed(true), remaining);
    return () => clearTimeout(timer);
  }, [deadline, windowClosed, isTerminal]);

  // A terminal answer: release the stored attempt and, on success, force the
  // entitlement caches to re-read. createCheckout deliberately invalidates
  // nothing, so this is the one place a subscription change enters the cache.
  useEffect(() => {
    if (settled.current || !isTerminal) return;

    settled.current = true;
    // Stops the poll. Without this the interval keeps hitting the backend for
    // an answer that can no longer change.
    setTerminal(true);
    clearPendingCheckout();

    if (status === "succeeded" && tenantId) {
      dispatch(
        baseApi.util.invalidateTags([
          { type: "Billing", id: `ME-${tenantId}` },
          // Seat usage moves with the plan, and the Clients header renders it.
          { type: "Clients", id: `LIST-${tenantId}` },
        ])
      );
    }
  }, [isTerminal, status, tenantId, dispatch]);

  const checkAgain = useCallback(() => {
    setDeadline(Date.now() + POLL_WINDOW_MS);
    setWindowClosed(false);
    attemptQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = resolveState({
    storageRead,
    tenantMismatch,
    attemptId,
    status,
    isError: attemptQuery.isError,
    hasData: Boolean(attempt),
    windowClosed,
  });

  return {
    state,
    attempt,
    startedInTenantId: tenantMismatch ? startedInTenantId : null,
    errorMsg:
      state === "request_error" ? messageForBillingError(attemptQuery.error) : null,
    checkAgain,
  };
}

function resolveState(input: {
  storageRead: boolean;
  tenantMismatch: boolean;
  attemptId: string | null;
  status: PaymentAttempt["status"] | undefined;
  isError: boolean;
  hasData: boolean;
  windowClosed: boolean;
}): CheckoutResultState {
  if (input.tenantMismatch) return "tenant_mismatch";
  // Don't call it missing until storage has actually been read.
  if (!input.attemptId) return input.storageRead ? "missing" : "loading";

  if (input.status === "succeeded") return "succeeded";
  if (input.status === "failed") return "failed";

  // An error only surfaces once automatic polling has given up. A 401 never
  // reaches here — baseQueryWithReauth refreshes and retries underneath — and a
  // 404 is frequently just a webhook that hasn't written the row yet.
  if (input.isError) return input.windowClosed ? "request_error" : "pending";

  if (!input.hasData) return "loading";
  return input.windowClosed ? "delayed" : "pending";
}
