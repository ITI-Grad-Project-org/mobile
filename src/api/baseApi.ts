import { clearActiveTenant } from '@/store/activeTenantSlice';
import { clearAuth, clearTokens } from '@/store/authSlice';
import { clearChatUi } from '@/store/chatUiSlice';
import { clearMemberships } from '@/store/membershipsSlice';
import { disconnectChatSocket } from '@/lib/chatSocket';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';

import { BASE_URL } from './config';
import { refreshAccessToken } from './tokenRefresh';

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
      // Shared with the native file uploader so concurrent 401s from a request
      // and an in-flight upload can't each spend the single-use refresh token.
      const refreshed = await refreshAccessToken();

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
    'Conversations',
    'Messages',
  ],
  endpoints: () => ({}),
});
