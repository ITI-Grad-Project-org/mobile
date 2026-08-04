import { baseApi } from '../baseApi';
import {
  CalendarQuery,
  UpdatePrescribedLoggedSetDto,
  CreateExtraLoggedSetDto,
  CompleteWorkoutDto,
} from '../types';

const T = '/client/me/training';

// Client-side workout execution. All endpoints require auth and are scoped to the
// active tenant via the x-tenant-id header.
export const trainingEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ----- Reading the plan
    getMyPrograms: builder.query<any[], void>({
      query: () => `${T}/programs`,
      providesTags: ['Programs'],
    }),
    getCurrentProgram: builder.query<any, void>({
      query: () => `${T}/programs/current`,
      providesTags: ['Programs'],
    }),
    getMyProgram: builder.query<any, string>({
      query: (programId) => `${T}/programs/${programId}`,
      providesTags: (result, error, programId) => [{ type: 'Program', id: programId }],
    }),
    getCalendar: builder.query<any, CalendarQuery>({
      query: ({ from, to }) => ({ url: `${T}/calendar`, params: { from, to } }),
      providesTags: ['Calendar'],
    }),
    getTrainingDay: builder.query<any, string>({
      query: (programDayId) => `${T}/days/${programDayId}`,
      providesTags: (result, error, programDayId) => [
        { type: 'TrainingDay', id: programDayId },
      ],
    }),

    // ----- Executing a workout
    // Idempotent: starts a new log or resumes the existing one.
    startOrResumeLog: builder.mutation<any, string>({
      query: (programDayId) => ({
        url: `${T}/days/${programDayId}/log`,
        method: 'POST',
      }),
      invalidatesTags: ['Calendar', 'TrainingDay'],
    }),
    skipTrainingDay: builder.mutation<any, string>({
      query: (programDayId) => ({
        url: `${T}/days/${programDayId}/skip`,
        method: 'POST',
      }),
      invalidatesTags: ['Calendar', 'TrainingDay'],
    }),
    getWorkoutLog: builder.query<any, string>({
      query: (logId) => `${T}/logs/${logId}`,
      providesTags: (result, error, logId) => [{ type: 'WorkoutLog', id: logId }],
    }),
    logSet: builder.mutation<
      any,
      { logId: string; loggedSetId: string; body: UpdatePrescribedLoggedSetDto }
    >({
      query: ({ logId, loggedSetId, body }) => ({
        url: `${T}/logs/${logId}/sets/${loggedSetId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { logId }) => [
        { type: 'WorkoutLog', id: logId },
        'TrainingDay',
        'Calendar',
      ],
    }),
    addExtraSet: builder.mutation<any, { logId: string; body: CreateExtraLoggedSetDto }>({
      query: ({ logId, body }) => ({
        url: `${T}/logs/${logId}/extra-sets`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { logId }) => [
        { type: 'WorkoutLog', id: logId },
        'TrainingDay',
        'Calendar',
      ],
    }),
    removeExtraSet: builder.mutation<any, { logId: string; loggedSetId: string }>({
      query: ({ logId, loggedSetId }) => ({
        url: `${T}/logs/${logId}/extra-sets/${loggedSetId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { logId }) => [
        { type: 'WorkoutLog', id: logId },
        'TrainingDay',
        'Calendar',
      ],
    }),
    completeWorkout: builder.mutation<any, { logId: string; body?: CompleteWorkoutDto }>({
      query: ({ logId, body }) => ({
        url: `${T}/logs/${logId}/complete`,
        method: 'POST',
        body: body ?? {},
      }),
      invalidatesTags: (result, error, { logId }) => [
        { type: 'WorkoutLog', id: logId },
        'TrainingDay',
        'Calendar',
        // A finished workout is a new mark on the activity heatmap.
        'Activity',
      ],
    }),
  }),
});

export const {
  useGetMyProgramsQuery,
  useLazyGetMyProgramsQuery,
  useGetCurrentProgramQuery,
  useLazyGetCurrentProgramQuery,
  useGetMyProgramQuery,
  useLazyGetMyProgramQuery,
  useGetCalendarQuery,
  useLazyGetCalendarQuery,
  useGetTrainingDayQuery,
  useLazyGetTrainingDayQuery,
  useStartOrResumeLogMutation,
  useSkipTrainingDayMutation,
  useGetWorkoutLogQuery,
  useLazyGetWorkoutLogQuery,
  useLogSetMutation,
  useAddExtraSetMutation,
  useRemoveExtraSetMutation,
  useCompleteWorkoutMutation,
} = trainingEndpoints;
