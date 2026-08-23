import { baseApi } from '../baseApi';
import {
  AddMealFromLibraryDto,
  CreateClientNutritionPlanDto,
  CreateLibraryMealAndAddDto,
  ListNutritionPlansQuery,
  ReplacePlannedMealItemsDto,
  RescheduleClientNutritionPlanDto,
  UpdateClientNutritionPlanDto,
  UpdateNutritionPlanDayDto,
  UpdatePlannedMealDto,
} from '../types';

const N = '/plans/nutrition/client-plans';

export const nutritionPlansEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ----- Plan level
    // tenantId is never sent in the URL — the x-tenant-id header/JWT does the
    // real scoping. It rides along in the args so the cache is keyed per tenant.
    // The plain tags stay so the mutations below (which only know a planId)
    // keep invalidating these entries.
    listNutritionPlans: builder.query<
      any[],
      ListNutritionPlansQuery & { tenantId: string }
    >({
      query: ({ tenantId, ...params }) => ({ url: N, params }),
      providesTags: (result, error, { tenantId }) => [
        'NutritionPlans',
        { type: 'NutritionPlans', id: `LIST-${tenantId}` },
      ],
    }),
    getNutritionPlan: builder.query<any, { tenantId: string; planId: string }>({
      query: ({ planId }) => `${N}/${planId}`,
      providesTags: (result, error, { tenantId, planId }) => [
        { type: 'NutritionPlan', id: planId },
        { type: 'NutritionPlan', id: `${tenantId}:${planId}` },
      ],
    }),
    createNutritionPlan: builder.mutation<any, CreateClientNutritionPlanDto>({
      query: (body) => ({ url: N, method: 'POST', body }),
      invalidatesTags: ['NutritionPlans'],
    }),
    updateNutritionPlan: builder.mutation<
      any,
      { planId: string; body: UpdateClientNutritionPlanDto }
    >({
      query: ({ planId, body }) => ({ url: `${N}/${planId}`, method: 'PATCH', body }),
      invalidatesTags: (result, error, { planId }) => [
        { type: 'NutritionPlan', id: planId },
        'NutritionPlans',
      ],
    }),
    deleteNutritionPlan: builder.mutation<any, string>({
      query: (planId) => ({ url: `${N}/${planId}`, method: 'DELETE' }),
      invalidatesTags: (result, error, planId) => [
        { type: 'NutritionPlan', id: planId },
        'NutritionPlans',
      ],
    }),
    publishNutritionPlan: builder.mutation<any, string>({
      query: (planId) => ({ url: `${N}/${planId}/publish`, method: 'POST' }),
      invalidatesTags: (result, error, planId) => [
        { type: 'NutritionPlan', id: planId },
        'NutritionPlans',
        'NutritionCalendar',
      ],
    }),
    // Only a *scheduled* plan can be rescheduled; picking today activates it
    // immediately and it can't be rescheduled again.
    rescheduleNutritionPlan: builder.mutation<
      any,
      { planId: string; body: RescheduleClientNutritionPlanDto }
    >({
      query: ({ planId, body }) => ({
        url: `${N}/${planId}/reschedule`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { planId }) => [
        { type: 'NutritionPlan', id: planId },
        'NutritionPlans',
        'NutritionCalendar',
      ],
    }),
    cancelNutritionPlan: builder.mutation<any, string>({
      query: (planId) => ({ url: `${N}/${planId}/cancel`, method: 'POST' }),
      invalidatesTags: (result, error, planId) => [
        { type: 'NutritionPlan', id: planId },
        'NutritionPlans',
        'NutritionCalendar',
      ],
    }),
    unarchiveNutritionPlan: builder.mutation<any, string>({
      query: (planId) => ({ url: `${N}/${planId}/unarchive`, method: 'POST' }),
      invalidatesTags: (result, error, planId) => [
        { type: 'NutritionPlan', id: planId },
        'NutritionPlans',
      ],
    }),

    // ----- Days (generated from startDate + durationWeeks; you update, not create)
    updateNutritionPlanDay: builder.mutation<
      any,
      { planId: string; dayId: string; body: UpdateNutritionPlanDayDto }
    >({
      query: ({ planId, dayId, body }) => ({
        url: `${N}/${planId}/days/${dayId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { planId }) => [
        { type: 'NutritionPlan', id: planId },
      ],
    }),

    // ----- Meals within a day. Adding to a fully flexible day returns 409.
    addMealFromLibrary: builder.mutation<
      any,
      { planId: string; dayId: string; body: AddMealFromLibraryDto }
    >({
      query: ({ planId, dayId, body }) => ({
        url: `${N}/${planId}/days/${dayId}/meals/from-library`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { planId }) => [
        { type: 'NutritionPlan', id: planId },
      ],
    }),
    createAndAddMeal: builder.mutation<
      any,
      { planId: string; dayId: string; body: CreateLibraryMealAndAddDto }
    >({
      query: ({ planId, dayId, body }) => ({
        url: `${N}/${planId}/days/${dayId}/meals/create-in-library`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { planId }) => [
        { type: 'NutritionPlan', id: planId },
        'Meals',
      ],
    }),
    updatePlannedMeal: builder.mutation<
      any,
      { planId: string; plannedMealId: string; body: UpdatePlannedMealDto }
    >({
      query: ({ planId, plannedMealId, body }) => ({
        url: `${N}/${planId}/meals/${plannedMealId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { planId }) => [
        { type: 'NutritionPlan', id: planId },
      ],
    }),
    deletePlannedMeal: builder.mutation<any, { planId: string; plannedMealId: string }>({
      query: ({ planId, plannedMealId }) => ({
        url: `${N}/${planId}/meals/${plannedMealId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { planId }) => [
        { type: 'NutritionPlan', id: planId },
      ],
    }),
    // PUT = full replacement. Must list every current planned Food exactly
    // once, in the desired order.
    replacePlannedMealItems: builder.mutation<
      any,
      { planId: string; plannedMealId: string; body: ReplacePlannedMealItemsDto }
    >({
      query: ({ planId, plannedMealId, body }) => ({
        url: `${N}/${planId}/meals/${plannedMealId}/items`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { planId }) => [
        { type: 'NutritionPlan', id: planId },
      ],
    }),

    // ----- Coach review: prescribed vs reported vs actual, with variance
    getNutritionPlanLogs: builder.query<any, string>({
      query: (planId) => `${N}/${planId}/logs`,
      providesTags: (result, error, planId) => [
        { type: 'NutritionLog', id: `PLAN-${planId}` },
      ],
    }),
    getNutritionDayLog: builder.query<
      any,
      { tenantId: string; planId: string; dayId: string }
    >({
      query: ({ planId, dayId }) => `${N}/${planId}/days/${dayId}/log`,
      providesTags: (result, error, { tenantId, dayId }) => [
        { type: 'NutritionLog', id: `DAY-${dayId}` },
        { type: 'NutritionLog', id: `${tenantId}:DAY-${dayId}` },
      ],
    }),
  }),
});

export const {
  useListNutritionPlansQuery,
  useLazyListNutritionPlansQuery,
  useGetNutritionPlanQuery,
  useLazyGetNutritionPlanQuery,
  useCreateNutritionPlanMutation,
  useUpdateNutritionPlanMutation,
  useDeleteNutritionPlanMutation,
  usePublishNutritionPlanMutation,
  useRescheduleNutritionPlanMutation,
  useCancelNutritionPlanMutation,
  useUnarchiveNutritionPlanMutation,
  useUpdateNutritionPlanDayMutation,
  useAddMealFromLibraryMutation,
  useCreateAndAddMealMutation,
  useUpdatePlannedMealMutation,
  useDeletePlannedMealMutation,
  useReplacePlannedMealItemsMutation,
  useGetNutritionPlanLogsQuery,
  useLazyGetNutritionPlanLogsQuery,
  useGetNutritionDayLogQuery,
  useLazyGetNutritionDayLogQuery,
} = nutritionPlansEndpoints;
