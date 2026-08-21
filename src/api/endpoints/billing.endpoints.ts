import { baseApi } from '../baseApi';
import type {
  BillingPlan,
  BillingSummary,
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  PaymentAttempt,
} from '../types';

const B = '/billing';

/** Cache-key bag for the tenant's own subscription. `tenantId` is never
 *  forwarded — core-api reads the tenant from the JWT. */
export interface BillingSummaryArgs {
  tenantId: string;
}

export interface CreateCheckoutArgs {
  tenantId: string;
  body: CreateCheckoutRequest;
}

export interface PaymentAttemptArgs {
  tenantId: string;
  /** The UUID returned by createCheckout — the only trusted handle on a
   *  payment. Anything Paymob puts in the browser URL is not authority. */
  paymentAttemptId: string;
}

/**
 * The coach's CoachHub subscription. Four coach-token routes; the fifth
 * (`POST /billing/paymob/webhook`) is Paymob-to-backend and the app must NEVER
 * call it — a payment is only real once that webhook lands.
 *
 * The flow these back: create a checkout, save `paymentAttemptId`, hand the
 * coach to the Paymob hosted page, then poll `getPaymentAttempt` on return.
 * The browser redirect proves nothing; polling is the only source of truth.
 *
 * A subscription belongs to ONE tenant. `getPaymentAttempt` searches by attempt
 * id AND authenticated tenant, so a 404 can mean "the coach switched tenants
 * mid-checkout" just as easily as "no such id" — never read it as proof the
 * payment failed.
 */
export const billingEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // The plan catalogue is the same for every coach, so it takes no tenantId.
    // Long TTL: prices and limits change on the order of never, and a tenant
    // switch resets the whole api state anyway.
    getBillingPlans: builder.query<BillingPlan[], void>({
      query: () => `${B}/plans`,
      providesTags: [{ type: 'Billing', id: 'PLANS' }],
      keepUnusedDataFor: 3600,
    }),

    // Effective plan, expiry, active-client usage and feature access. Read
    // `plan` for what the coach can do now; `storedPlan` only to explain an
    // expiry.
    //
    // Callers pass `refetchOnFocus: true` (a hook option, not an endpoint one —
    // see useEntitlements): a payment completes OUTSIDE the app, so the coach
    // returns from Paymob on a foreground event, and stale entitlements here
    // mean a wrongly locked or wrongly open UI. setupListeners is already wired
    // to RN AppState in src/store.
    getMyBilling: builder.query<BillingSummary, BillingSummaryArgs>({
      query: () => `${B}/me`,
      providesTags: (result, error, { tenantId }) => [
        { type: 'Billing', id: `ME-${tenantId}` },
      ],
      keepUnusedDataFor: 60,
    }),

    // Creates a pending attempt and a Paymob Intention. Body is ONLY { plan } —
    // the backend rejects unknown fields and owns price, currency and duration.
    //
    // Deliberately NO invalidatesTags: starting a checkout changes nothing.
    // The subscription moves when Paymob's webhook reaches the backend, which
    // is why the result screen invalidates ME-<tenantId> by hand on success.
    // Invalidating here would refetch /billing/me to the same stale answer and
    // suggest the plan had changed.
    createCheckout: builder.mutation<CreateCheckoutResponse, CreateCheckoutArgs>({
      query: ({ body }) => ({
        url: `${B}/checkout`,
        method: 'POST',
        body,
      }),
    }),

    // Polled from the result screen via RTK Query's own `pollingInterval`.
    // keepUnusedDataFor is 0 so a revisit re-reads the server instead of
    // rendering a cached `pending` for an attempt that has since succeeded.
    getPaymentAttempt: builder.query<PaymentAttempt, PaymentAttemptArgs>({
      query: ({ paymentAttemptId }) =>
        `${B}/payments/${encodeURIComponent(paymentAttemptId)}`,
      providesTags: (result, error, { tenantId, paymentAttemptId }) => [
        { type: 'Billing', id: `PAYMENT-${tenantId}:${paymentAttemptId}` },
      ],
      keepUnusedDataFor: 0,
    }),
  }),
});

export const {
  useGetBillingPlansQuery,
  useLazyGetBillingPlansQuery,
  useGetMyBillingQuery,
  useLazyGetMyBillingQuery,
  useCreateCheckoutMutation,
  useGetPaymentAttemptQuery,
  useLazyGetPaymentAttemptQuery,
} = billingEndpoints;
