import { baseApi } from '../baseApi';

export const clientsEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getClients: builder.query<any[], { tenantId: string }>({
      query: () => '/client',
      providesTags: (result, error, { tenantId }) => [
        { type: 'Clients', id: `LIST-${tenantId}` },
        ...(result ?? []).map((client) => ({ type: 'Clients' as const, id: `${tenantId}:${client.id}` })),
      ],
    }),
    getClient: builder.query<any, { id: string; tenantId: string }>({
      query: ({ id }) => `/client/${id}`,
      providesTags: (result, error, { id, tenantId }) => [{ type: 'Clients', id: `${tenantId}:${id}` }],
    }),
    removeClient: builder.mutation<any, { id: string; tenantId: string }>({
      query: ({ id }) => ({
        url: `/client/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { id, tenantId }) => [
        { type: 'Clients', id: `LIST-${tenantId}` },
        { type: 'Clients', id: `${tenantId}:${id}` },
      ],
    }),
  }),
});

export const {
  useGetClientsQuery,
  useLazyGetClientsQuery,
  useGetClientQuery,
  useRemoveClientMutation,
} = clientsEndpoints;
