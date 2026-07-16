import { baseApi } from '../baseApi';
import { CreateMeasurementDto } from '../types';

export interface ListMeasurementsParams {
  tenantId: string;
  page?: number;
  limit?: number;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

export const measurementsEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createMeasurement: builder.mutation<any, { body: CreateMeasurementDto; tenantId: string }>({
      query: ({ body }) => ({
        url: '/client/me/measurements',
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { tenantId }) => [
        { type: 'Measurements', id: `LIST-${tenantId}` },
      ],
    }),
    listMeasurements: builder.query<any, ListMeasurementsParams>({
      query: ({ page = 1, limit = 10, from, to }) => ({
        url: '/client/me/measurements',
        params: { page, limit, from, to },
      }),
      providesTags: (result, error, { tenantId }) => [
        { type: 'Measurements', id: `LIST-${tenantId}` },
        ...(result?.data ?? []).map((m: any) => ({ type: 'Measurements' as const, id: `${tenantId}:${m.id}` })),
      ],
    }),
    getMeasurement: builder.query<any, { id: string; tenantId: string }>({
      query: ({ id }) => `/client/me/measurements/${id}`,
      providesTags: (result, error, { id, tenantId }) => [{ type: 'Measurements', id: `${tenantId}:${id}` }],
    }),
    updateMeasurement: builder.mutation<any, { id: string; body: Partial<CreateMeasurementDto>; tenantId: string }>({
      query: ({ id, body }) => ({
        url: `/client/me/measurements/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { id, tenantId }) => [
        { type: 'Measurements', id: `LIST-${tenantId}` },
        { type: 'Measurements', id: `${tenantId}:${id}` },
      ],
    }),
    deleteMeasurement: builder.mutation<any, { id: string; tenantId: string }>({
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
  useUpdateMeasurementMutation,
  useDeleteMeasurementMutation,
} = measurementsEndpoints;
