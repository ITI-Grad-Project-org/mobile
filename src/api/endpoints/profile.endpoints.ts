import { baseApi } from '../baseApi';
import { UpdateCoachDto, UpdateClientDto } from '../types';

export const profileEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCoachProfile: builder.query<any, void>({
      query: () => '/coaches/me',
      providesTags: ['Me'],
    }),
    updateCoachProfile: builder.mutation<any, UpdateCoachDto>({
      query: (body) => ({
        url: '/coaches/me',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Me'],
    }),
    deleteCoachProfile: builder.mutation<any, void>({
      query: () => ({
        url: '/coaches/me',
        method: 'DELETE',
      }),
      invalidatesTags: ['Me'],
    }),
    getCoachById: builder.query<any, string>({
      query: (id) => `/coaches/${id}`,
    }),
    getPublicCoachProfile: builder.query<any, string>({
      query: (tenantId) => `/coaches/${tenantId}/profile`,
    }),
    getClientProfile: builder.query<any, void>({
      query: () => '/clients/me',
      providesTags: ['Me'],
    }),
    updateClientProfile: builder.mutation<any, UpdateClientDto>({
      query: (body) => ({
        url: '/clients/me',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Me'],
    }),
    deleteClientProfile: builder.mutation<any, void>({
      query: () => ({
        url: '/clients/me',
        method: 'DELETE',
      }),
      invalidatesTags: ['Me'],
    }),
  }),
});

export const {
  useGetCoachProfileQuery,
  useLazyGetCoachProfileQuery,
  useUpdateCoachProfileMutation,
  useDeleteCoachProfileMutation,
  useGetCoachByIdQuery,
  useGetPublicCoachProfileQuery,
  useGetClientProfileQuery,
  useLazyGetClientProfileQuery,
  useUpdateClientProfileMutation,
  useDeleteClientProfileMutation,
} = profileEndpoints;
