import { baseApi } from '../baseApi';
import {
  CreateClientProgramDto,
  UpdateClientProgramDto,
  RescheduleClientProgramDto,
  ListProgramsQuery,
  UpdateProgramDayDto,
  PrescribeExerciseDto,
  CreateAndPrescribeExerciseDto,
  UpdatePlannedExerciseDto,
  PrescribedSetDto,
} from '../types';

const P = '/plans/training/client-programs';

// Coach-side training program builder. All endpoints require auth and are
// scoped to the active tenant via the x-tenant-id header.
// Lifecycle: create draft -> build days/exercises/sets -> publish -> reschedule/cancel.
export const programsEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ----- Program level
    // tenantId is never sent in the URL — the x-tenant-id header/JWT does the
    // real scoping. It rides along in the args so the cache is keyed per tenant
    // and a tenant switch can't serve the previous coach's programs.
    listPrograms: builder.query<any[], ListProgramsQuery & { tenantId: string }>({
      query: ({ tenantId, ...params }) => ({ url: P, params }),
      // The plain tag stays so the mutations below (which only know a programId)
      // keep invalidating these lists.
      providesTags: (result, error, { tenantId }) => [
        'Programs',
        { type: 'Programs', id: `LIST-${tenantId}` },
      ],
    }),
    getProgram: builder.query<any, { tenantId: string; programId: string }>({
      query: ({ programId }) => `${P}/${programId}`,
      providesTags: (result, error, { tenantId, programId }) => [
        { type: 'Program', id: programId },
        { type: 'Program', id: `${tenantId}:${programId}` },
      ],
    }),
    createProgram: builder.mutation<any, CreateClientProgramDto>({
      query: (body) => ({ url: P, method: 'POST', body }),
      // Assigning work changes what analytics counts as scheduled.
      invalidatesTags: ['Programs', 'Analytics'],
    }),
    updateProgram: builder.mutation<
      any,
      { programId: string; body: UpdateClientProgramDto }
    >({
      query: ({ programId, body }) => ({
        url: `${P}/${programId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { programId }) => [
        { type: 'Program', id: programId },
        'Programs',
      ],
    }),
    deleteProgram: builder.mutation<any, string>({
      query: (programId) => ({ url: `${P}/${programId}`, method: 'DELETE' }),
      invalidatesTags: (result, error, programId) => [
        { type: 'Program', id: programId },
        'Programs',
        'Analytics',
      ],
    }),
    publishProgram: builder.mutation<any, string>({
      query: (programId) => ({ url: `${P}/${programId}/publish`, method: 'POST' }),
      invalidatesTags: (result, error, programId) => [
        { type: 'Program', id: programId },
        'Programs',
        'Analytics',
      ],
    }),
    rescheduleProgram: builder.mutation<
      any,
      { programId: string; body: RescheduleClientProgramDto }
    >({
      query: ({ programId, body }) => ({
        url: `${P}/${programId}/reschedule`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { programId }) => [
        { type: 'Program', id: programId },
        'Programs',
        'Analytics',
      ],
    }),
    cancelProgram: builder.mutation<any, string>({
      query: (programId) => ({ url: `${P}/${programId}/cancel`, method: 'POST' }),
      invalidatesTags: (result, error, programId) => [
        { type: 'Program', id: programId },
        'Programs',
        'Analytics',
      ],
    }),
    // Restore an archived program to the coach's normal lists.
    unarchiveProgram: builder.mutation<any, string>({
      query: (programId) => ({ url: `${P}/${programId}/unarchive`, method: 'POST' }),
      invalidatesTags: (result, error, programId) => [
        { type: 'Program', id: programId },
        'Programs',
        'Analytics',
      ],
    }),

    // ----- Days (generated from startDate + durationWeeks; you update, not create)
    updateProgramDay: builder.mutation<
      any,
      { programId: string; programDayId: string; body: UpdateProgramDayDto }
    >({
      query: ({ programId, programDayId, body }) => ({
        url: `${P}/${programId}/days/${programDayId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { programId }) => [{ type: 'Program', id: programId }],
    }),
    getProgramDayLog: builder.query<
      any,
      { tenantId: string; programId: string; programDayId: string }
    >({
      query: ({ programId, programDayId }) =>
        `${P}/${programId}/days/${programDayId}/log`,
      providesTags: (result, error, { tenantId, programDayId }) => [
        { type: 'Program', id: `${tenantId}:DAY-${programDayId}` },
      ],
    }),

    // ----- Exercises within a day
    addExerciseFromLibrary: builder.mutation<
      any,
      { programId: string; programDayId: string; body: PrescribeExerciseDto }
    >({
      query: ({ programId, programDayId, body }) => ({
        url: `${P}/${programId}/days/${programDayId}/exercises/from-library`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { programId }) => [{ type: 'Program', id: programId }],
    }),
    createAndPrescribeExercise: builder.mutation<
      any,
      { programId: string; programDayId: string; body: CreateAndPrescribeExerciseDto }
    >({
      query: ({ programId, programDayId, body }) => ({
        url: `${P}/${programId}/days/${programDayId}/exercises/create-in-library`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { programId }) => [
        { type: 'Program', id: programId },
        'Exercises',
      ],
    }),
    updatePlannedExercise: builder.mutation<
      any,
      { programId: string; plannedExerciseId: string; body: UpdatePlannedExerciseDto }
    >({
      query: ({ programId, plannedExerciseId, body }) => ({
        url: `${P}/${programId}/exercises/${plannedExerciseId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { programId }) => [{ type: 'Program', id: programId }],
    }),
    deletePlannedExercise: builder.mutation<
      any,
      { programId: string; plannedExerciseId: string }
    >({
      query: ({ programId, plannedExerciseId }) => ({
        url: `${P}/${programId}/exercises/${plannedExerciseId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { programId }) => [{ type: 'Program', id: programId }],
    }),
    // PUT = full replacement of every prescribed set. Send every set you want to keep.
    replacePlannedSets: builder.mutation<
      any,
      { programId: string; plannedExerciseId: string; sets: PrescribedSetDto[] }
    >({
      query: ({ programId, plannedExerciseId, sets }) => ({
        url: `${P}/${programId}/exercises/${plannedExerciseId}/sets`,
        method: 'PUT',
        body: { sets },
      }),
      invalidatesTags: (result, error, { programId }) => [{ type: 'Program', id: programId }],
    }),

    // ----- Log review
    getProgramLogs: builder.query<any, string>({
      query: (programId) => `${P}/${programId}/logs`,
    }),
  }),
});

export const {
  useListProgramsQuery,
  useLazyListProgramsQuery,
  useGetProgramQuery,
  useLazyGetProgramQuery,
  useCreateProgramMutation,
  useUpdateProgramMutation,
  useDeleteProgramMutation,
  usePublishProgramMutation,
  useRescheduleProgramMutation,
  useCancelProgramMutation,
  useUnarchiveProgramMutation,
  useUpdateProgramDayMutation,
  useGetProgramDayLogQuery,
  useLazyGetProgramDayLogQuery,
  useAddExerciseFromLibraryMutation,
  useCreateAndPrescribeExerciseMutation,
  useUpdatePlannedExerciseMutation,
  useDeletePlannedExerciseMutation,
  useReplacePlannedSetsMutation,
  useGetProgramLogsQuery,
  useLazyGetProgramLogsQuery,
} = programsEndpoints;
