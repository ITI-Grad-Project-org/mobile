import { clearActiveTenant } from '@/store/activeTenantSlice';
import { clearAuth, clearTokens } from '@/store/authSlice';
import { clearChatUi } from '@/store/chatUiSlice';
import { clearMemberships } from '@/store/membershipsSlice';
import { disconnectAiSocket } from '@/lib/aiSocket';
import { disconnectChatSocket } from '@/lib/chatSocket';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';

import { BASE_URL } from './config';
import { describeToken } from './jwt';
import { currentTenantEpoch } from './tenantEpoch';
import { tokenGeneration, tokensMintedAt } from './tokenGeneration';
import { refreshSession } from './tokenRefresh';

const STALE_TENANT_ERROR: FetchBaseQueryError = {
  status: 'CUSTOM_ERROR',
  error: 'Response discarded: fetched under a previous tenant.',
};

/**
 * A token this young cannot have expired, so a 401 on a request that started
 * AFTER it was minted is the route refusing this token — not a stale one.
 * Refreshing again would only spend the single-use refresh token on a request
 * that is going to 401 anyway; a screen that keeps retrying such a route (chat
 * does, on every focus) turns that into a refresh storm, and one lost race in
 * that storm is a logout.
 */
const FRESH_TOKEN_MS = 15_000;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: async (headers, { getState }) => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    const state = getState() as any;
    const tenantId = state.activeTenant.tenantId;
    if (tenantId) {
      headers.set('x-tenant-id', tenantId);
    }
    return headers;
  },
});

function forceLogout(api: Parameters<BaseQueryFn>[1]) {
  const state = api.getState() as any;
  if (!state?.auth?.isAuthenticated) {
    return;
  }

  clearTokens();
  // Both sockets hold their own copy of the now-dead token.
  disconnectChatSocket();
  disconnectAiSocket();
  api.dispatch(clearAuth());
  api.dispatch(clearChatUi());
  api.dispatch(clearActiveTenant());
  api.dispatch(clearMemberships());
  api.dispatch(baseApi.util.resetApiState());
}

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> =
  async (args, api, extraOptions) => {
    const startedUnderEpoch = currentTenantEpoch();
    const startedUnderGeneration = tokenGeneration();
    const startedAt = Date.now();
    let result = await rawBaseQuery(args, api, extraOptions);

    // A tenant switch landed while this was in flight: the payload belongs to
    // the old coach. Drop it before anything can cache or render it — and
    // before the 401 branch, since an expired old-tenant token must not log the
    // (now correctly authenticated) user out.
    if (currentTenantEpoch() !== startedUnderEpoch) {
      return { error: STALE_TENANT_ERROR };
    }

    const url = typeof args === 'string' ? args : args.url;
    const isAuthRequest =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/google') ||
      url.includes('/auth/customer/login') ||
      url.includes('/auth/customer/register') ||
      url.includes('/auth/customer/refresh') ||
      url.includes('/auth/customer/google');

    if (result.error?.status === 401 && !isAuthRequest) {
      // A 401 means one of two very different things, and only the first is
      // about the session:
      //   1. this token is stale        → refresh, retry, carry on
      //   2. this ROUTE refuses this token (wrong persona surface, a token
      //      minted before the client joined a coach, a role the server won't
      //      accept) → a new token changes nothing, and signing the user out
      //      over it is how a broken chat read became a forced logout.
      const rotatedWhileInFlight = tokenGeneration() !== startedUnderGeneration;
      const mintedAt = tokensMintedAt();
      const tokenWasFresh = mintedAt > 0 && startedAt - mintedAt < FRESH_TOKEN_MS;

      // Someone else already rotated the token under us: this request just
      // carried the old one. Retry on the new one without spending another
      // single-use refresh token.
      const outcome = rotatedWhileInFlight
        ? 'refreshed'
        : tokenWasFresh
          ? 'refused'
          : // Shared with the native file uploader so concurrent 401s from a
            // request and an in-flight upload can't each spend the refresh token.
            await refreshSession();

      if (outcome === 'refreshed') {
        // Retry the original request with the new token.
        result = await rawBaseQuery(args, api, extraOptions);
        if (currentTenantEpoch() !== startedUnderEpoch) {
          return { error: STALE_TENANT_ERROR };
        }
        // Still 401 on a token minted seconds ago: case 2. Surface the error to
        // the screen — it is not evidence the session is over.
      } else if (outcome === 'rejected') {
        // The server refused the refresh token itself. The session really is
        // over — this is the ONLY path that signs the user out.
        forceLogout(api);
      }
      // 'unavailable' (offline, timeout, 5xx) and 'refused' both keep the
      // session and let the caller show its own error state.

      if (__DEV__ && result.error?.status === 401) {
        // Name the token the server rejected. "Invalid token type" on a route
        // like /client/me/* is a token minted for the other surface (or before
        // the client had a tenant), which no amount of refreshing fixes.
        const token = await SecureStore.getItemAsync('accessToken');
        console.warn(
          `[auth] 401 on ${url} (outcome=${outcome}): ${describeToken(token)}`
        );
      }
    }
    return result;
  };

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Me',
    'Tenant',
    'Clients',
    'Intake',
    'Measurements',
    'Invitations',
    'Reviews',
    /**
     * The public face of one coach: the directory row, the public profile and
     * the rating aggregate. Separate from 'Reviews' because the client's own
     * review is a member of the aggregate — writing it has to refresh the
     * PUBLIC numbers, not just the client's own copy of the review.
     */
    'CoachProfile',
    'Memberships',
    'Directory',
    'JoinRequests',
    'Exercises',
    'Programs',
    'Program',
    'Calendar',
    'TrainingDay',
    'WorkoutLog',
    'Foods',
    'Meals',
    'NutritionPlans',
    'NutritionPlan',
    'NutritionCalendar',
    'NutritionDay',
    'NutritionLog',
    'Activity',
    'Analytics',
    'Conversations',
    'Messages',
    /**
     * The coach's own CoachHub subscription: the plan catalogue, the tenant's
     * effective plan + entitlements, and individual Paymob payment attempts.
     * Nothing the app does invalidates this directly — a plan only changes when
     * Paymob's webhook reaches the backend — so the result screen invalidates
     * `ME-<tenantId>` by hand once an attempt reports `succeeded`.
     */
    'Billing',
  ],
  endpoints: () => ({}),
});
