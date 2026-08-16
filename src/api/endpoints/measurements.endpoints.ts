import { baseApi } from '../baseApi';
import { appendFields, appendFiles } from '../formData';
import { unwrapList } from '../pagination';
import {
  ListMeasurementsResponse,
  Measurement,
  MeasurementFields,
} from '../types';

export interface ListMeasurementsParams {
  tenantId: string;
  page?: number;
  limit?: number;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
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
    updateMeasurement: builder.mutation<Measurement, MeasurementWriteArgs & { id: string }>({
      query: ({ id, ...args }) => ({
        url: `/client/me/measurements/${id}`,
        method: 'PATCH',
        body: measurementForm(args),
      }),
      invalidatesTags: (result, error, { id, tenantId }) => [
        { type: 'Measurements', id: `LIST-${tenantId}` },
        { type: 'Measurements', id: `${tenantId}:${id}` },
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
  useUpdateMeasurementMutation,
  useDeleteMeasurementMutation,
} = measurementsEndpoints;
