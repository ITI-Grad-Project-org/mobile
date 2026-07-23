import { baseApi } from '../baseApi';
import { CreateInvitationDto } from '../types';

// The client-facing invitation routes (GET/DELETE /client/me/invitations) are not
// implemented server-side yet. Until they are, querying them returns 401, which the
// global reauth wrapper escalates to a full logout (clears the active tenant + resets
// the RTK Query cache). Keep the client invitation feature dormant until the backend
// ships those routes — flip this to `true` then. See baseApi.ts reauth logic.
export const CLIENT_INVITATIONS_READY = false;

export const invitationsEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createInvitation: builder.mutation<any, { body: CreateInvitationDto; tenantId: string }>({
      query: ({ body }) => ({
        url: '/invitation',
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { tenantId }) => [
        { type: 'Invitations', id: `LIST-${tenantId}` },
      ],
    }),
    listInvitations: builder.query<any[], { tenantId: string }>({
      query: () => '/invitation',
      providesTags: (result, error, { tenantId }) => [
        { type: 'Invitations', id: `LIST-${tenantId}` },
        ...(result ?? []).map((invite) => ({ type: 'Invitations' as const, id: `${tenantId}:${invite.id}` })),
      ],
    }),
    getInvitation: builder.query<any, { id: string; tenantId: string }>({
      query: ({ id }) => `/invitation/${id}`,
      providesTags: (result, error, { id, tenantId }) => [{ type: 'Invitations', id: `${tenantId}:${id}` }],
    }),
    revokeInvitation: builder.mutation<any, { id: string; tenantId: string }>({
      query: ({ id }) => ({
        url: `/invitation/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { id, tenantId }) => [
        { type: 'Invitations', id: `LIST-${tenantId}` },
        { type: 'Invitations', id: `${tenantId}:${id}` },
      ],
    }),

    // ----- Client side (/client/me/invitations) — invites addressed to the
    // logged-in client, spanning all tenants (NOT active-tenant scoped). The
    // 'MINE' id namespaces this feed away from the coach LIST-${tenantId} caches.
    listMyInvitations: builder.query<any[], void>({
      // API responses are untyped; the card types its own props locally.
      query: () => '/client/me/invitations',
      providesTags: [{ type: 'Invitations', id: 'MINE' }],
    }),
    declineInvitation: builder.mutation<any, { id: string }>({
      query: ({ id }) => ({
        url: `/client/me/invitations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Invitations', id: 'MINE' }],
    }),
  }),
});

export const {
  useCreateInvitationMutation,
  useListInvitationsQuery,
  useLazyListInvitationsQuery,
  useGetInvitationQuery,
  useRevokeInvitationMutation,
  useListMyInvitationsQuery,
  useDeclineInvitationMutation,
} = invitationsEndpoints;

