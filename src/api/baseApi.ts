import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import * as SecureStore from 'expo-secure-store';
import { clearAuth, saveTokens, clearTokens } from '@/store/authSlice';
import { clearActiveTenant } from '@/store/activeTenantSlice';
import { clearMemberships } from '@/store/membershipsSlice';

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

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> =
  async (args, api, extraOptions) => {
    let result = await rawBaseQuery(args, api, extraOptions);

    if (result.error?.status === 401) {
      const state = api.getState() as any;
      const persona = state.auth.persona;
      const refreshToken = await SecureStore.getItemAsync('refreshToken');

      if (persona && refreshToken) {
        const refreshPath = persona === 'coach' ? '/auth/refresh' : '/auth/customer/refresh';

        try {
          const refreshResult = await rawBaseQuery(
            {
              url: refreshPath,
              method: 'POST',
              headers: { authorization: `Bearer ${refreshToken}` },
            },
            api,
            extraOptions
          );

          if (refreshResult.data) {
            const data = refreshResult.data as {
              accessToken: string;
              refreshToken: string;
              user?: { id: string };
            };
            
            // Save new tokens
            await saveTokens(data.accessToken, data.refreshToken, persona);

            // Retry original request
            result = await rawBaseQuery(args, api, extraOptions);
          } else {
            // Failed to refresh - log out
            await clearTokens();
            api.dispatch(clearAuth());
            api.dispatch(clearActiveTenant());
            api.dispatch(clearMemberships());
            api.dispatch(baseApi.util.resetApiState());
          }
        } catch {
          await clearTokens();
          api.dispatch(clearAuth());
          api.dispatch(clearActiveTenant());
          api.dispatch(clearMemberships());
          api.dispatch(baseApi.util.resetApiState());
        }
      } else {
        // No tokens or persona, log out
        await clearTokens();
        api.dispatch(clearAuth());
        api.dispatch(clearActiveTenant());
        api.dispatch(clearMemberships());
        api.dispatch(baseApi.util.resetApiState());
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
  ],
  endpoints: () => ({}),
});
