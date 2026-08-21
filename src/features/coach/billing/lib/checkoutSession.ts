import type { SubscriptionPlan } from "@/api/types";
import * as SecureStore from "expo-secure-store";

/**
 * The pending Paymob checkout, persisted across the trip out of the app.
 *
 * Why persist at all: Paymob's redirect URL is configured server-side as a WEB
 * page (uply-gamma.vercel.app/billing/result), so nothing comes back into the
 * app carrying the attempt id. The trusted id was handed to us by CoachHub
 * BEFORE we left — this is where it waits. Query values in the returning
 * browser URL are never authority.
 *
 * Why SecureStore: AsyncStorage isn't a dependency and SecureStore is this
 * app's only persistence layer. The payload holds no secret — a UUID and a plan
 * name — so this is a storage choice, not a security one.
 */
const PENDING_CHECKOUT_KEY = "pendingCheckout";

export interface PendingCheckout {
  paymentAttemptId: string;
  /**
   * The tenant that started the checkout. A subscription belongs to one tenant,
   * and GET /billing/payments/:id matches on attempt id AND tenant — so without
   * this, a coach who switched businesses mid-checkout gets a bare 404 that
   * reads like "your payment vanished".
   */
  tenantId: string;
  plan: Exclude<SubscriptionPlan, "free">;
  createdAt: string;
}

export async function savePendingCheckout(pending: PendingCheckout): Promise<void> {
  await SecureStore.setItemAsync(PENDING_CHECKOUT_KEY, JSON.stringify(pending));
}

/** Returns null when nothing is stored or the stored blob is unreadable —
 *  a corrupt entry must not crash the result screen. */
export async function readPendingCheckout(): Promise<PendingCheckout | null> {
  try {
    const raw = await SecureStore.getItemAsync(PENDING_CHECKOUT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.paymentAttemptId || !parsed?.tenantId) return null;

    return parsed as PendingCheckout;
  } catch {
    return null;
  }
}

/**
 * Clear ONLY on a terminal answer from the backend (succeeded or failed).
 * A slow webhook, a 404 under the wrong tenant, an expired token or a network
 * blip must all keep the attempt so "Check again" still has something to check.
 */
export async function clearPendingCheckout(): Promise<void> {
  await SecureStore.deleteItemAsync(PENDING_CHECKOUT_KEY);
}
