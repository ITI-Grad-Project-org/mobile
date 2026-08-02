import { baseApi } from '../baseApi';
import { appendFile } from '../formData';
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
    // multipart/form-data — a single required binary `logo` part.
    updateTenantLogo: builder.mutation<any, { uri: string }>({
      query: ({ uri }) => {
        const form = new FormData();
        appendFile(form, 'logo', uri, 'logo.png');
        return { url: '/tenant/me/logo', method: 'PATCH', body: form };
      },
      invalidatesTags: ['Tenant', 'Memberships'],
    }),
  }),
});

export const {
  useCreateTenantMutation,
  useGetTenantMeQuery,
  useLazyGetTenantMeQuery,
  useGetTenantByIdQuery,
  useGetTenantBySlugQuery,
  useUpdateTenantLogoMutation,
} = tenantEndpoints;
