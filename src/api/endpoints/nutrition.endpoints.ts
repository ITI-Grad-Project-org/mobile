import { baseApi } from '../baseApi';
import {
  CalendarQuery,
  ClientListFoodsQuery,
  CreateActualFoodLogDto,
  UpdateActualFoodLogDto,
  UpdateLoggedMealOutcomeDto,
  UpdateNutritionDayLogDto,
} from '../types';

const N = '/client/me/nutrition';

export const nutritionEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ----- Reading the plan
    getMyNutritionPlans: builder.query<any[], void>({
      query: () => `${N}/plans`,
      providesTags: ['NutritionPlans'],
    }),
    // 409 here means two published plans cover today — surface the conflict
    // rather than treating it as "no plan".
    getCurrentNutritionPlan: builder.query<any, void>({
      query: () => `${N}/plans/current`,
      providesTags: ['NutritionPlans'],
    }),
    getMyNutritionPlan: builder.query<any, string>({
      query: (planId) => `${N}/plans/${planId}`,
      providesTags: (result, error, planId) => [{ type: 'NutritionPlan', id: planId }],
    }),
    getNutritionCalendar: builder.query<any, CalendarQuery>({
      query: ({ from, to }) => ({ url: `${N}/calendar`, params: { from, to } }),
      providesTags: ['NutritionCalendar'],
    }),
    getNutritionDay: builder.query<any, string>({
      query: (dayId) => `${N}/days/${dayId}`,
      // Tagged so finishing or skipping refreshes the day's log state — the day
      // payload is what a finished day's history is read back from.
      providesTags: (result, error, dayId) => [{ type: 'NutritionDay', id: dayId }],
    }),
    // Read-only browse of the coach's Food library — active Foods only, so no
    // `includeInactive`. Separate cache namespace from the coach's own list.
    browseCoachFoods: builder.query<any[], { tenantId: string } & ClientListFoodsQuery>({
      query: ({ search, servingUnit, dietaryTag, allergen }) => ({
        url: `${N}/library/foods`,
        params: { search, servingUnit, dietaryTag, allergen },
      }),
      providesTags: (result, error, { tenantId }) => [
        { type: 'Foods', id: `MINE-${tenantId}` },
      ],
    }),

    // ----- Logging
    // Idempotent: starts a new log or resumes the existing one.
    startOrResumeNutritionLog: builder.mutation<any, string>({
      query: (dayId) => ({ url: `${N}/days/${dayId}/log`, method: 'POST' }),
      invalidatesTags: ['NutritionCalendar'],
    }),
    skipNutritionDay: builder.mutation<any, string>({
      query: (dayId) => ({ url: `${N}/days/${dayId}/skip`, method: 'POST' }),
      invalidatesTags: (result, error, dayId) => [
        { type: 'NutritionDay', id: dayId },
        'NutritionCalendar',
      ],
    }),
    getNutritionLog: builder.query<any, string>({
      query: (logId) => `${N}/logs/${logId}`,
      providesTags: (result, error, logId) => [{ type: 'NutritionLog', id: logId }],
    }),
    updateNutritionLog: builder.mutation<
      any,
      { logId: string; body: UpdateNutritionDayLogDto }
    >({
      query: ({ logId, body }) => ({ url: `${N}/logs/${logId}`, method: 'PATCH', body }),
      invalidatesTags: (result, error, { logId }) => [
        { type: 'NutritionLog', id: logId },
      ],
    }),
    setLoggedMealOutcome: builder.mutation<
      any,
      { logId: string; loggedMealId: string; body: UpdateLoggedMealOutcomeDto }
    >({
      query: ({ logId, loggedMealId, body }) => ({
        url: `${N}/logs/${logId}/meals/${loggedMealId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { logId }) => [
        { type: 'NutritionLog', id: logId },
      ],
    }),
    // Library mode: { foodId, amount, mealSlot }.
    // Manual mode:  { foodName, calories, proteinG, …, mealSlot } — totals.
    addActualFood: builder.mutation<any, { logId: string; body: CreateActualFoodLogDto }>({
      query: ({ logId, body }) => ({
        url: `${N}/logs/${logId}/foods`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { logId }) => [
        { type: 'NutritionLog', id: logId },
      ],
    }),
    updateActualFood: builder.mutation<
      any,
      { logId: string; foodLogId: string; body: UpdateActualFoodLogDto }
    >({
      query: ({ logId, foodLogId, body }) => ({
        url: `${N}/logs/${logId}/foods/${foodLogId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { logId }) => [
        { type: 'NutritionLog', id: logId },
      ],
    }),
    deleteActualFood: builder.mutation<any, { logId: string; foodLogId: string }>({
      query: ({ logId, foodLogId }) => ({
        url: `${N}/logs/${logId}/foods/${foodLogId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { logId }) => [
        { type: 'NutritionLog', id: logId },
      ],
    }),
    // 409 if a planned Meal is still pending an outcome.
    completeNutritionLog: builder.mutation<any, string>({
      query: (logId) => ({ url: `${N}/logs/${logId}/complete`, method: 'POST' }),
      invalidatesTags: (result, error, logId) => [
        { type: 'NutritionLog', id: logId },
        'NutritionCalendar',
        // The mutation only knows the log id, so the day is invalidated by type.
        // Only the day currently on screen is mounted, so this is one refetch.
        'NutritionDay',
        // A finished nutrition day is a new mark on the activity heatmap.
        'Activity',
      ],
    }),
  }),
});

export const {
  useGetMyNutritionPlansQuery,
  useLazyGetMyNutritionPlansQuery,
  useGetCurrentNutritionPlanQuery,
  useLazyGetCurrentNutritionPlanQuery,
  useGetMyNutritionPlanQuery,
  useLazyGetMyNutritionPlanQuery,
  useGetNutritionCalendarQuery,
  useLazyGetNutritionCalendarQuery,
  useGetNutritionDayQuery,
  useLazyGetNutritionDayQuery,
  useBrowseCoachFoodsQuery,
  useLazyBrowseCoachFoodsQuery,
  useStartOrResumeNutritionLogMutation,
  useSkipNutritionDayMutation,
  useGetNutritionLogQuery,
  useLazyGetNutritionLogQuery,
  useUpdateNutritionLogMutation,
  useSetLoggedMealOutcomeMutation,
  useAddActualFoodMutation,
  useUpdateActualFoodMutation,
  useDeleteActualFoodMutation,
  useCompleteNutritionLogMutation,
} = nutritionEndpoints;
