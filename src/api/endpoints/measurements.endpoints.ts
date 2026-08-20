import { baseApi } from '../baseApi';
import { appendFields, appendFiles } from '../formData';
import { unwrapList } from '../pagination';
import {
  ListMeasurementsResponse,
  ListPendingReviewsResponse,
  Measurement,
  MeasurementFields,
  PendingMeasurement,
} from '../types';

export interface ListMeasurementsParams {
  tenantId: string;
  page?: number;
  limit?: number;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

export interface PendingReviewsParams {
  tenantId: string;
  page?: number;
  limit?: number;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

export interface ReviewMeasurementArgs {
  measurementId: string;
  tenantId: string;
  /**
   * The client's USER id, when the caller knows it. Only used to invalidate
   * that client's history — the route itself addresses the measurement.
   */
  clientId?: string;
  /** Optional note back to the client, stored on the measurement. */
  coachFeedback?: string;
}

/**
 * Create/update take multipart/form-data with FLAT fields and binary `photos`
 * parts. Pass local URIs — already-hosted photos are skipped, since there's
 * nothing to re-upload.
 */
export interface MeasurementWriteArgs {
  fields: MeasurementFields;
  photoUris?: string[];
  tenantId: string;
}

function measurementForm({ fields, photoUris }: MeasurementWriteArgs): FormData {
  const form = new FormData();
  appendFields(form, fields);
  appendFiles(form, 'photos', photoUris, 'photo');
  return form;
}

export const measurementsEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createMeasurement: builder.mutation<Measurement, MeasurementWriteArgs>({
      query: (args) => ({
        url: '/client/me/measurements',
        method: 'POST',
        body: measurementForm(args),
      }),
      invalidatesTags: (result, error, { tenantId }) => [
        { type: 'Measurements', id: `LIST-${tenantId}` },
        // A new measurement lands in the coach's review queue unreviewed, so
        // that queue is stale the moment this succeeds.
        { type: 'Measurements', id: `PENDING-${tenantId}` },
      ],
    }),
    // The API may return a bare array or a paginated envelope; keep the response
    // loosely typed and normalise on read (see deriveMeasurementStats).
    listMeasurements: builder.query<ListMeasurementsResponse | Measurement[], ListMeasurementsParams>({
      query: ({ page = 1, limit = 10, from, to }) => ({
        url: '/client/me/measurements',
        params: { page, limit, from, to },
      }),
      providesTags: (result, error, { tenantId }) => {
        // Rows live under `docs`, not `data` — reading the wrong key here meant
        // no per-measurement tags were ever emitted, so a single-measurement
        // invalidation silently did nothing.
        const list = unwrapList<Measurement>(result);
        return [
          { type: 'Measurements', id: `LIST-${tenantId}` },
          ...list.map((m) => ({ type: 'Measurements' as const, id: `${tenantId}:${m.id}` })),
        ];
      },
    }),
    getMeasurement: builder.query<Measurement, { id: string; tenantId: string }>({
      query: ({ id }) => `/client/me/measurements/${id}`,
      providesTags: (result, error, { id, tenantId }) => [{ type: 'Measurements', id: `${tenantId}:${id}` }],
    }),

    // ----- Coach-side reads. Same shape as /client/me, addressed by clientId.
    // `clientId` is the client's USER id (the one /client returns), not a
    // membershipId — a 404 here means the client isn't in this tenant.
    listClientMeasurements: builder.query<
      ListMeasurementsResponse | Measurement[],
      ListMeasurementsParams & { clientId: string }
    >({
      query: ({ clientId, page = 1, limit = 10, from, to }) => ({
        url: `/client/${clientId}/measurements`,
        params: { page, limit, from, to },
      }),
      providesTags: (result, error, { tenantId, clientId }) => {
        const list = unwrapList<Measurement>(result);
        return [
          { type: 'Measurements', id: `CLIENT-${tenantId}:${clientId}` },
          ...list.map((m) => ({ type: 'Measurements' as const, id: `${tenantId}:${m.id}` })),
        ];
      },
    }),
    getClientMeasurement: builder.query<
      Measurement,
      { clientId: string; id: string; tenantId: string }
    >({
      query: ({ clientId, id }) => `/client/${clientId}/measurements/${id}`,
      providesTags: (result, error, { id, tenantId }) => [
        { type: 'Measurements', id: `${tenantId}:${id}` },
      ],
    }),
    // ----- Coach review state. `reviewed` is server-side, not a device-local
    // watermark: this list is the authority on what is still unread, and the
    // PATCH below is the only way anything leaves it. There is no un-review
    // route, so marking is one-way.
    listPendingReviews: builder.query<
      ListPendingReviewsResponse | PendingMeasurement[],
      PendingReviewsParams
    >({
      query: ({ page = 1, limit = 10, from, to }) => ({
        url: '/measurements/reviews/pending',
        params: { page, limit, from, to },
      }),
      providesTags: (result, error, { tenantId }) => {
        const list = unwrapList<PendingMeasurement>(result);
        return [
          { type: 'Measurements', id: `PENDING-${tenantId}` },
          ...list.map((m) => ({ type: 'Measurements' as const, id: `${tenantId}:${m.id}` })),
        ];
      },
    }),
    reviewMeasurement: builder.mutation<Measurement, ReviewMeasurementArgs>({
      query: ({ measurementId, coachFeedback }) => ({
        url: `/measurements/${measurementId}/review`,
        method: 'PATCH',
        // The body is required even when there is nothing to say.
        body: { coachFeedback },
      }),
      invalidatesTags: (result, error, { tenantId, measurementId, clientId }) => [
        { type: 'Measurements', id: `PENDING-${tenantId}` },
        { type: 'Measurements', id: `${tenantId}:${measurementId}` },
        // The client's history renders the review state too, so it can't keep
        // serving rows from before the mark.
        ...(clientId
          ? [{ type: 'Measurements' as const, id: `CLIENT-${tenantId}:${clientId}` }]
          : []),
      ],
    }),

    updateMeasurement: builder.mutation<Measurement, MeasurementWriteArgs & { id: string }>({
      query: ({ id, ...args }) => ({
        url: `/client/me/measurements/${id}`,
        method: 'PATCH',
        body: measurementForm(args),
      }),
      invalidatesTags: (result, error, { id, tenantId }) => [
        { type: 'Measurements', id: `LIST-${tenantId}` },
        { type: 'Measurements', id: `${tenantId}:${id}` },
        { type: 'Measurements', id: `PENDING-${tenantId}` },
      ],
    }),
    deleteMeasurement: builder.mutation<void, { id: string; tenantId: string }>({
      query: ({ id }) => ({
        url: `/client/me/measurements/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { id, tenantId }) => [
        { type: 'Measurements', id: `LIST-${tenantId}` },
        { type: 'Measurements', id: `${tenantId}:${id}` },
        // A deleted measurement leaves the review queue too.
        { type: 'Measurements', id: `PENDING-${tenantId}` },
      ],
    }),
  }),
});

export const {
  useCreateMeasurementMutation,
  useListMeasurementsQuery,
  useLazyListMeasurementsQuery,
  useGetMeasurementQuery,
  useListClientMeasurementsQuery,
  useLazyListClientMeasurementsQuery,
  useGetClientMeasurementQuery,
  useListPendingReviewsQuery,
  useReviewMeasurementMutation,
  useUpdateMeasurementMutation,
  useDeleteMeasurementMutation,
} = measurementsEndpoints;
