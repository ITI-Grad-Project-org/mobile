import { baseApi } from '../baseApi';
import { CreateReviewDto, UpdateReviewDto } from '../types';

export const reviewsEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // `unknown`, not `any[]`: the endpoint documents no response body, so
    // callers go through normalizeReviews rather than trusting a shape the
    // API never promised. The list may also arrive inside an envelope.
    getCoachReviews: builder.query<unknown, { tenantId: string }>({
      query: () => '/reviews/me',
      providesTags: (result, error, { tenantId }) => [
        { type: 'Reviews', id: `COACH-LIST-${tenantId}` },
      ],
    }),
    getPublicReviews: builder.query<any[], { tenantId: string }>({
      query: ({ tenantId }) => `/reviews/coaches/${tenantId}`,
    }),
    getPublicReviewsSummary: builder.query<any, { tenantId: string }>({
      query: ({ tenantId }) => `/reviews/coaches/${tenantId}/summary`,
    }),
    createClientReview: builder.mutation<any, { body: CreateReviewDto; tenantId: string }>({
      query: ({ body }) => ({
        url: '/client/me/reviews',
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { tenantId }) => [
        { type: 'Reviews', id: `CURRENT-${tenantId}` },
        { type: 'Reviews', id: `COACH-LIST-${tenantId}` },
      ],
    }),
    getClientCurrentReview: builder.query<any, { tenantId: string }>({
      query: () => '/client/me/reviews/current',
      providesTags: (result, error, { tenantId }) => [
        { type: 'Reviews', id: `CURRENT-${tenantId}` },
      ],
    }),
    updateClientReview: builder.mutation<any, { body: UpdateReviewDto; tenantId: string }>({
      query: ({ body }) => ({
        url: '/client/me/reviews',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { tenantId }) => [
        { type: 'Reviews', id: `CURRENT-${tenantId}` },
        { type: 'Reviews', id: `COACH-LIST-${tenantId}` },
      ],
    }),
    deleteClientReview: builder.mutation<any, { tenantId: string }>({
      query: () => ({
        url: '/client/me/reviews',
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { tenantId }) => [
        { type: 'Reviews', id: `CURRENT-${tenantId}` },
        { type: 'Reviews', id: `COACH-LIST-${tenantId}` },
      ],
    }),
  }),
});

export const {
  useGetCoachReviewsQuery,
  useLazyGetCoachReviewsQuery,
  useGetPublicReviewsQuery,
  useGetPublicReviewsSummaryQuery,
  useCreateClientReviewMutation,
  useGetClientCurrentReviewQuery,
  useLazyGetClientCurrentReviewQuery,
  useUpdateClientReviewMutation,
  useDeleteClientReviewMutation,
} = reviewsEndpoints;
