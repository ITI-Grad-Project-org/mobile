import { baseApi } from '../baseApi';
import type {
  Adherence,
  AdherenceParams,
  AnalyticsActivityParams,
  AnalyticsActivityRow,
  Attention,
  AttentionParams,
  DateWindow,
  Overview,
  Progress,
  Roster,
  SurvivalPoint,
  TemplateEffectiveness,
} from '../types';

const A = '/analytics';

/**
 * Coach-only analytics. Every route is read-only and served through core-api,
 * which appends the tenant from the JWT — so `tenantId` here is a CACHE KEY
 * ONLY and is deliberately never forwarded as a query param. Each query
 * destructures it out before building `params` for exactly that reason.
 *
 * Analytics is derived data: it moves whenever a client logs anything, so the
 * cache is kept short-lived and coach writes that change the underlying work
 * (programme create / publish / reschedule / cancel) invalidate `Analytics`.
 *
 * A 404 from the per-client route means the membership belongs to another
 * tenant. Surface it as an error — rendering it as an empty state hides a
 * wrong-tenant bug behind "this client did nothing".
 */
export const analyticsEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Everything on the coach Home tab in one request. `attentionCounts` are
    // badges for getAttention computed at the DEFAULT thresholds: render the
    // badge from here and the list from there without passing custom
    // thresholds, or a badge saying 3 opens a list of 5.
    getAnalyticsOverview: builder.query<Overview, DateWindow & { tenantId: string }>({
      query: ({ tenantId, ...window }) => ({ url: `${A}/overview`, params: window }),
      providesTags: (result, error, { tenantId, from, to }) => [
        { type: 'Analytics', id: `OVERVIEW-${tenantId}-${from ?? ''}-${to ?? ''}` },
        { type: 'Analytics', id: `LIST-${tenantId}` },
      ],
      keepUnusedDataFor: 60,
    }),

    // Three already-sorted queues — message / review / renew. Render in the
    // order received.
    getAttention: builder.query<Attention, AttentionParams & { tenantId: string }>({
      query: ({ tenantId, ...params }) => ({ url: `${A}/attention`, params }),
      providesTags: (result, error, { tenantId }) => [
        { type: 'Analytics', id: `ATTENTION-${tenantId}` },
        { type: 'Analytics', id: `LIST-${tenantId}` },
      ],
      keepUnusedDataFor: 60,
    }),

    // Newest first by `loggedAt` (when it was logged), not by `trainingDate`.
    // Not an audit trail: rows disappear when a client un-logs, so don't cache
    // it as history or diff two fetches. Paginate with the window, not an
    // offset. `limit` is 1–200 and rejected outside that.
    getAnalyticsActivity: builder.query<
      AnalyticsActivityRow[],
      AnalyticsActivityParams & { tenantId: string }
    >({
      query: ({ tenantId, ...params }) => ({ url: `${A}/activity`, params }),
      providesTags: (result, error, { tenantId }) => [
        { type: 'Analytics', id: `ACTIVITY-${tenantId}` },
        { type: 'Analytics', id: `LIST-${tenantId}` },
      ],
      keepUnusedDataFor: 30,
    }),

    // Ordered worst-adherence-first: risk list = top, leaderboard = bottom
    // reversed. One call feeds both sections — don't fetch it twice.
    getRoster: builder.query<Roster, DateWindow & { tenantId: string }>({
      query: ({ tenantId, ...window }) => ({ url: `${A}/roster`, params: window }),
      providesTags: (result, error, { tenantId, from, to }) => [
        { type: 'Analytics', id: `ROSTER-${tenantId}-${from ?? ''}-${to ?? ''}` },
        { type: 'Analytics', id: `LIST-${tenantId}` },
      ],
      keepUnusedDataFor: 60,
    }),

    // Omit `membershipId` for the whole roster. Session completion and volume
    // adherence are two independent readings: show both, never average them,
    // and never show `volumeAdherencePct` without `comparableSets`.
    getAdherence: builder.query<Adherence, AdherenceParams & { tenantId: string }>({
      query: ({ tenantId, ...params }) => ({ url: `${A}/adherence`, params }),
      providesTags: (result, error, { tenantId, membershipId }) => [
        { type: 'Analytics', id: `ADHERENCE-${tenantId}-${membershipId ?? 'ROSTER'}` },
        { type: 'Analytics', id: `LIST-${tenantId}` },
      ],
      keepUnusedDataFor: 60,
    }),

    // The Progress tab's headline data — whether the work worked, not whether
    // it got done. Measurements come back exactly as recorded with gaps intact.
    getClientProgress: builder.query<
      Progress,
      { membershipId: string; tenantId: string } & DateWindow
    >({
      query: ({ membershipId, tenantId, ...window }) => ({
        url: `${A}/clients/${membershipId}/progress`,
        params: window,
      }),
      providesTags: (result, error, { tenantId, membershipId, from, to }) => [
        {
          type: 'Analytics',
          id: `PROGRESS-${tenantId}:${membershipId}-${from ?? ''}-${to ?? ''}`,
        },
        { type: 'Analytics', id: `LIST-${tenantId}` },
      ],
      keepUnusedDataFor: 60,
    }),

    // NOT windowed — every template's whole history. Don't pass a date window.
    getProgramEffectiveness: builder.query<TemplateEffectiveness[], { tenantId: string }>({
      query: () => `${A}/programs/effectiveness`,
      providesTags: (result, error, { tenantId }) => [
        { type: 'Analytics', id: `EFFECTIVENESS-${tenantId}` },
        { type: 'Analytics', id: `LIST-${tenantId}` },
      ],
      keepUnusedDataFor: 300,
    }),

    // Also NOT windowed. Natural drill-down from getProgramEffectiveness: tap a
    // template row, get its retention curve. 404 = unknown template for this
    // tenant.
    getTemplateSurvival: builder.query<
      SurvivalPoint[],
      { templateId: string; tenantId: string }
    >({
      query: ({ templateId }) => `${A}/programs/${templateId}/survival`,
      providesTags: (result, error, { tenantId, templateId }) => [
        { type: 'Analytics', id: `SURVIVAL-${tenantId}:${templateId}` },
        { type: 'Analytics', id: `LIST-${tenantId}` },
      ],
      keepUnusedDataFor: 300,
    }),
  }),
});

export const {
  useGetAnalyticsOverviewQuery,
  useLazyGetAnalyticsOverviewQuery,
  useGetAttentionQuery,
  useLazyGetAttentionQuery,
  useGetAnalyticsActivityQuery,
  useLazyGetAnalyticsActivityQuery,
  useGetRosterQuery,
  useLazyGetRosterQuery,
  useGetAdherenceQuery,
  useLazyGetAdherenceQuery,
  useGetClientProgressQuery,
  useLazyGetClientProgressQuery,
  useGetProgramEffectivenessQuery,
  useGetTemplateSurvivalQuery,
  useLazyGetTemplateSurvivalQuery,
} = analyticsEndpoints;
