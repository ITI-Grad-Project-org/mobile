import { baseApi } from '../baseApi';
import { CreateJoinRequestDto } from '../types';

// Join requests: the inverse of invitations. A client finds a coach in the
// directory and applies; the coach approves/rejects. All endpoints require auth.
export const joinRequestsEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ----- Client side (/client/me/join-requests) — spans the client's tenants
    createJoinRequest: builder.mutation<any, CreateJoinRequestDto>({
      query: (body) => ({
        url: '/client/me/join-requests',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'JoinRequests', id: 'MINE' }],
    }),
    listMyJoinRequests: builder.query<any[], void>({
      query: () => '/client/me/join-requests',
      providesTags: [{ type: 'JoinRequests', id: 'MINE' }],
    }),
    withdrawJoinRequest: builder.mutation<any, { id: string }>({
      query: ({ id }) => ({
        url: `/client/me/join-requests/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'JoinRequests', id: 'MINE' }],
    }),

    // ----- Coach side (/join-requests) — scoped to the active tenant
    listTenantJoinRequests: builder.query<any[], { tenantId: string }>({
      query: () => '/join-requests',
      providesTags: (result, error, { tenantId }) => [
        { type: 'JoinRequests', id: `TENANT-${tenantId}` },
      ],
    }),
    approveJoinRequest: builder.mutation<any, { id: string; tenantId: string }>({
      query: ({ id }) => ({
        url: `/join-requests/${id}/approve`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { tenantId }) => [
        { type: 'JoinRequests', id: `TENANT-${tenantId}` },
        { type: 'Clients', id: `LIST-${tenantId}` },
      ],
    }),
    rejectJoinRequest: builder.mutation<any, { id: string; tenantId: string }>({
      query: ({ id }) => ({
        url: `/join-requests/${id}/reject`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { tenantId }) => [
        { type: 'JoinRequests', id: `TENANT-${tenantId}` },
      ],
    }),
  }),
});

export const {
  useCreateJoinRequestMutation,
  useListMyJoinRequestsQuery,
  useLazyListMyJoinRequestsQuery,
  useWithdrawJoinRequestMutation,
  useListTenantJoinRequestsQuery,
  useLazyListTenantJoinRequestsQuery,
  useApproveJoinRequestMutation,
  useRejectJoinRequestMutation,
} = joinRequestsEndpoints;
