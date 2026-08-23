import { baseApi } from '../baseApi';
import {
  CalendarQuery,
  UpdatePrescribedLoggedSetDto,
  CreateExtraLoggedSetDto,
  CompleteWorkoutDto,
} from '../types';

const T = '/client/me/training';

type TenantScoped<T = unknown> = T & { tenantId: string };

// Client-side workout execution. All endpoints require auth; the server resolves
// the tenant from the JWT, so a switch must re-key these caches.
export const trainingEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ----- Reading the plan
    getMyPrograms: builder.query<any[], TenantScoped>({
      query: () => `${T}/programs`,
      providesTags: ['Programs'],
    }),
    getCurrentProgram: builder.query<any, TenantScoped>({
      query: () => `${T}/programs/current`,
      providesTags: ['Programs'],
    }),
    getMyProgram: builder.query<any, TenantScoped<{ programId: string }>>({
      query: ({ programId }) => `${T}/programs/${programId}`,
      providesTags: (result, error, { programId }) => [
        { type: 'Program', id: programId },
      ],
    }),
    getCalendar: builder.query<any, TenantScoped<CalendarQuery>>({
      query: ({ from, to }) => ({ url: `${T}/calendar`, params: { from, to } }),
      providesTags: ['Calendar'],
    }),
    getTrainingDay: builder.query<any, TenantScoped<{ programDayId: string }>>({
      query: ({ programDayId }) => `${T}/days/${programDayId}`,
      providesTags: (result, error, { programDayId }) => [
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
      // Skipping also moves a day out of "upcoming", so the program payload the
      // plan-details screen counts from has to be refetched too, and it removes
      // every set activity that workout had already put on the heatmap.
      invalidatesTags: ['Calendar', 'TrainingDay', 'Activity', 'Program', 'Programs'],
    }),
    getWorkoutLog: builder.query<any, TenantScoped<{ logId: string }>>({
      query: ({ logId }) => `${T}/logs/${logId}`,
      providesTags: (result, error, { logId }) => [{ type: 'WorkoutLog', id: logId }],
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
        // The set outcome — not /complete — is the activity-producing request:
        // completed/partial adds activity, skipped removes it. The heatmap can
        // move while the workout is still in_progress.
        'Activity',
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
        // A completed/partial extra set adds one activity.
        'Activity',
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
        // Deleting an extra set removes its activity.
        'Activity',
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
        // Completion itself adds no activity — the set outcomes already did.
        // Kept as a cheap safety net for activity recorded on another device.
        'Activity',
        // The program payload carries each day's completion state, which is what
        // the plan-details week progress counts. Without this the bar stays
        // frozen until the cache expires. No id: the mutation only knows the
        // logId, and an untagged type invalidates every entry of that type.
        'Program',
        'Programs',
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
