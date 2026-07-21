import { baseApi } from '../baseApi';
import { CreateInvitationDto, AcceptInvitationDto } from '../types';

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
    previewInvitation: builder.query<any, { token: string }>({
      query: ({ token }) => `/invitation/token/${token}`,
    }),
    // Accept now takes a body — send `{}` at minimum, or an embedded intake payload.
    acceptInvitation: builder.mutation<any, { token: string; body?: AcceptInvitationDto }>({
      query: ({ token, body }) => ({
        url: `/invitation/token/${token}/accept`,
        method: 'POST',
        body: body ?? {},
      }),
      invalidatesTags: ['Memberships', 'Tenant', 'Me', 'Intake'],
    }),
  }),
});

export const {
  useCreateInvitationMutation,
  useListInvitationsQuery,
  useLazyListInvitationsQuery,
  useGetInvitationQuery,
  useRevokeInvitationMutation,
  usePreviewInvitationQuery,
  useLazyPreviewInvitationQuery,
  useAcceptInvitationMutation,
} = invitationsEndpoints;
