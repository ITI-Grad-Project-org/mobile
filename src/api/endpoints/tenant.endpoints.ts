import { baseApi } from '../baseApi';
import { CreateTenantDto } from '../types';

export const tenantEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createTenant: builder.mutation<any, CreateTenantDto>({
      query: (body) => ({
        url: '/tenant',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Tenant', 'Memberships'],
    }),
    getTenantMe: builder.query<any, void>({
      query: () => '/tenant/me',
      providesTags: ['Tenant'],
    }),
    getTenantById: builder.query<any, string>({
      query: (id) => `/tenant/${id}`,
      providesTags: (result, error, id) => [{ type: 'Tenant', id }],
    }),
    getTenantBySlug: builder.query<any, string>({
      query: (slug) => `/tenant/slug/${slug}`,
    }),
  }),
});

export const {
  useCreateTenantMutation,
  useGetTenantMeQuery,
  useLazyGetTenantMeQuery,
  useGetTenantByIdQuery,
  useGetTenantBySlugQuery,
} = tenantEndpoints;
