import { baseApi } from '../baseApi';
import { CreateExerciseDto, UpdateExerciseDto, ListExercisesQuery } from '../types';

// Per-tenant, coach-managed exercise library. All endpoints require auth and are
// scoped to the active tenant via the x-tenant-id header.
export const exercisesEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    initializeLibraryFromDefaults: builder.mutation<any, { tenantId: string }>({
      query: () => ({
        url: '/exercises/initialize-library-from-defaults',
        method: 'POST',
      }),
      invalidatesTags: (result, error, { tenantId }) => [
        { type: 'Exercises', id: `LIST-${tenantId}` },
      ],
    }),
    createExercise: builder.mutation<any, { body: CreateExerciseDto; tenantId: string }>({
      query: ({ body }) => ({
        url: '/exercises',
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { tenantId }) => [
        { type: 'Exercises', id: `LIST-${tenantId}` },
      ],
    }),
    listExercises: builder.query<any[], { tenantId: string } & ListExercisesQuery>({
      query: ({ category, primaryMuscle, search, includeInactive }) => ({
        url: '/exercises',
        params: { category, primaryMuscle, search, includeInactive },
      }),
      providesTags: (result, error, { tenantId }) => [
        { type: 'Exercises', id: `LIST-${tenantId}` },
        ...(result ?? []).map((ex: any) => ({
          type: 'Exercises' as const,
          id: `${tenantId}:${ex.id}`,
        })),
      ],
    }),
    getExercise: builder.query<any, { exerciseId: string; tenantId: string }>({
      query: ({ exerciseId }) => `/exercises/${exerciseId}`,
      providesTags: (result, error, { exerciseId, tenantId }) => [
        { type: 'Exercises', id: `${tenantId}:${exerciseId}` },
      ],
    }),
    updateExercise: builder.mutation<
      any,
      { exerciseId: string; body: UpdateExerciseDto; tenantId: string }
    >({
      query: ({ exerciseId, body }) => ({
        url: `/exercises/${exerciseId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { exerciseId, tenantId }) => [
        { type: 'Exercises', id: `LIST-${tenantId}` },
        { type: 'Exercises', id: `${tenantId}:${exerciseId}` },
      ],
    }),
    // Archive (soft delete)
    archiveExercise: builder.mutation<any, { exerciseId: string; tenantId: string }>({
      query: ({ exerciseId }) => ({
        url: `/exercises/${exerciseId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { exerciseId, tenantId }) => [
        { type: 'Exercises', id: `LIST-${tenantId}` },
        { type: 'Exercises', id: `${tenantId}:${exerciseId}` },
      ],
    }),
  }),
});

export const {
  useInitializeLibraryFromDefaultsMutation,
  useCreateExerciseMutation,
  useListExercisesQuery,
  useLazyListExercisesQuery,
  useGetExerciseQuery,
  useUpdateExerciseMutation,
  useArchiveExerciseMutation,
} = exercisesEndpoints;
