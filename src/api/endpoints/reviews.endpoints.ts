import { baseApi } from '../baseApi';
import { CreateReviewDto, ReviewSummary, UpdateReviewDto } from '../types';

/**
 * Tags for one coach's public face. The client's own review counts INTO the
 * public aggregate, so every write on /client/me/reviews has to invalidate
 * these — not only the client's own copy of the review.
 */
const coachProfileTags = (tenantId: string) =>
  [{ type: 'CoachProfile' as const, id: tenantId }];

const ownReviewTags = (tenantId: string) => [
  { type: 'Reviews' as const, id: `CURRENT-${tenantId}` },
  { type: 'Reviews' as const, id: `COACH-LIST-${tenantId}` },
];

/**
 * Fold one rating in or out of an aggregate.
 *
 * `delta` is +1 when a review is being added, -1 when removed, 0 for an edit
 * (the count is unchanged, only the mean moves). Returns null when the summary
 * can't be reasoned about — the caller then leaves the cache alone and waits
 * for the refetch rather than inventing a number.
 */
function foldRating(
  summary: ReviewSummary | undefined,
  { previous, next, delta }: { previous?: number | null; next?: number | null; delta: -1 | 0 | 1 }
): ReviewSummary | null {
  if (!summary) return null;

  const total = summary.totalReviews ?? summary.count;
  const average = summary.averageRating ?? summary.average;
  if (typeof total !== 'number') return null;

  const nextTotal = Math.max(0, total + delta);
  if (nextTotal === 0) {
    // No ratings left. `null` average, never 0.0 — a zero would render as a
    // catastrophic score for a coach who simply has no reviews.
    return { ...summary, totalReviews: 0, count: 0, averageRating: undefined, average: undefined };
  }

  // Sum of the ratings we currently believe in, with the old value removed and
  // the new one added.
  const currentSum = typeof average === 'number' ? average * total : 0;
  const nextSum = currentSum - (previous ?? 0) + (next ?? 0);
  const nextAverage = nextSum / nextTotal;

  return {
    ...summary,
    totalReviews: nextTotal,
    count: nextTotal,
    averageRating: nextAverage,
    average: nextAverage,
  };
}

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
      providesTags: (result, error, { tenantId }) => coachProfileTags(tenantId),
    }),
    getPublicReviewsSummary: builder.query<ReviewSummary, { tenantId: string }>({
      query: ({ tenantId }) => `/reviews/coaches/${tenantId}/summary`,
      providesTags: (result, error, { tenantId }) => coachProfileTags(tenantId),
    }),
    createClientReview: builder.mutation<any, { body: CreateReviewDto; tenantId: string }>({
      query: ({ body }) => ({
        url: '/client/me/reviews',
        method: 'POST',
        body,
      }),
      // The header must flip from "—" to "5.0 · 1 review" on the tap, not a
      // round-trip later. The invalidation below still runs and reconciles.
      async onQueryStarted({ body, tenantId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          reviewsEndpoints.util.updateQueryData(
            'getPublicReviewsSummary',
            { tenantId },
            (draft) => {
              const folded = foldRating(draft, { next: body.rating, delta: 1 });
              return folded ?? draft;
            }
          )
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (result, error, { tenantId }) => [
        ...ownReviewTags(tenantId),
        ...coachProfileTags(tenantId),
      ],
    }),
    getClientCurrentReview: builder.query<any, { tenantId: string }>({
      query: () => '/client/me/reviews/current',
      providesTags: (result, error, { tenantId }) => [
        { type: 'Reviews', id: `CURRENT-${tenantId}` },
      ],
    }),
    updateClientReview: builder.mutation<
      any,
      { body: UpdateReviewDto; tenantId: string; previousRating?: number | null }
    >({
      query: ({ body }) => ({
        url: '/client/me/reviews',
        method: 'PATCH',
        body,
      }),
      async onQueryStarted({ body, tenantId, previousRating }, { dispatch, queryFulfilled }) {
        // An edit that didn't touch the stars leaves the aggregate alone.
        const shouldPatch = typeof body.rating === 'number' && body.rating !== previousRating;
        const patch = shouldPatch
          ? dispatch(
              reviewsEndpoints.util.updateQueryData(
                'getPublicReviewsSummary',
                { tenantId },
                (draft) => {
                  const folded = foldRating(draft, {
                    previous: previousRating,
                    next: body.rating,
                    delta: 0,
                  });
                  return folded ?? draft;
                }
              )
            )
          : null;
        try {
          await queryFulfilled;
        } catch {
          patch?.undo();
        }
      },
      invalidatesTags: (result, error, { tenantId }) => [
        ...ownReviewTags(tenantId),
        ...coachProfileTags(tenantId),
      ],
    }),
    deleteClientReview: builder.mutation<any, { tenantId: string; previousRating?: number | null }>({
      query: () => ({
        url: '/client/me/reviews',
        method: 'DELETE',
      }),
      async onQueryStarted({ tenantId, previousRating }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          reviewsEndpoints.util.updateQueryData(
            'getPublicReviewsSummary',
            { tenantId },
            (draft) => {
              const folded = foldRating(draft, { previous: previousRating, delta: -1 });
              return folded ?? draft;
            }
          )
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (result, error, { tenantId }) => [
        ...ownReviewTags(tenantId),
        ...coachProfileTags(tenantId),
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
