import { clearActiveTenant } from '@/store/activeTenantSlice';
import { clearAuth, clearTokens, saveTokens } from '@/store/authSlice';
import { clearChatUi } from '@/store/chatUiSlice';
import { clearMemberships } from '@/store/membershipsSlice';
import { disconnectChatSocket } from '@/lib/chatSocket';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.74.162.148.3.nip.io';

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

let refreshInFlight: Promise<boolean> | null = null;

async function refreshTokens(
  api: Parameters<BaseQueryFn>[1]
): Promise<boolean> {
  const state = api.getState() as any;
  const persona = state.auth.persona as 'coach' | 'customer' | null;
  const refreshToken = await SecureStore.getItemAsync('refreshToken');
  if (!persona || !refreshToken) return false;

  const refreshPath = persona === 'coach' ? '/auth/refresh' : '/auth/customer/refresh';
  try {
    const refreshResult = await rawBaseQuery(
      {
        url: refreshPath,
        method: 'POST',
        headers: { authorization: `Bearer ${refreshToken}` },
      },
      api,
      {}
    );
    const data = refreshResult.data as
      | { accessToken?: string; refreshToken?: string }
      | undefined;
    if (data?.accessToken && data?.refreshToken) {
      await saveTokens(data.accessToken, data.refreshToken, persona);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function forceLogout(api: Parameters<BaseQueryFn>[1]) {
  clearTokens();
  // The chat socket holds its own copy of the now-dead token.
  disconnectChatSocket();
  api.dispatch(clearAuth());
  api.dispatch(clearChatUi());
  api.dispatch(clearActiveTenant());
  api.dispatch(clearMemberships());
  api.dispatch(baseApi.util.resetApiState());
}

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> =
  async (args, api, extraOptions) => {
    let result = await rawBaseQuery(args, api, extraOptions);

    const url = typeof args === 'string' ? args : args.url;
    const isAuthRequest =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/customer/login') ||
      url.includes('/auth/customer/register') ||
      url.includes('/auth/customer/refresh');

    if (result.error?.status === 401 && !isAuthRequest) {
      // Coalesce concurrent 401s onto one refresh attempt.
      if (!refreshInFlight) {
        refreshInFlight = refreshTokens(api).finally(() => {
          refreshInFlight = null;
        });
      }
      const refreshed = await refreshInFlight;

      if (refreshed) {
        // Retry the original request with the new token.
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        forceLogout(api);
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
    'Memberships',
    'Directory',
    'JoinRequests',
    'Exercises',
    'Programs',
    'Program',
    'Calendar',
    'WorkoutLog',
    'Foods',
    'Meals',
    'NutritionPlans',
    'NutritionPlan',
    'NutritionCalendar',
    'NutritionLog',
    'Activity',
    'Conversations',
    'Messages',
  ],
  endpoints: () => ({}),
});
