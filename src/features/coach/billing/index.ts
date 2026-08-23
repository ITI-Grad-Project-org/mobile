/**
 * The coach's own CoachHub subscription (Free / Solo / Studio via Paymob).
 *
 * Not coach-to-client payments — CoachHub doesn't handle those in V1.
 *
 * The one rule worth repeating: Paymob's redirect target is configured
 * server-side as a WEB page, so nothing returns into the app carrying a result.
 * A payment is only real once GET /billing/payments/:id says `succeeded`.
 */
export { UpgradeSheet } from "./components/UpgradeSheet";
export { useBillingData } from "./hooks/useBillingData";
export { useCheckout } from "./hooks/useCheckout";
export { useEntitlements, type Entitlements } from "./hooks/useEntitlements";
export { isForbidden, messageForBillingError, serverMessage } from "./lib/errors";
export { planDisplayName, planHint, usageLabel } from "./lib/format";
export { BillingScreen } from "./screens/BillingScreen";
export { CheckoutResultScreen } from "./screens/CheckoutResultScreen";
