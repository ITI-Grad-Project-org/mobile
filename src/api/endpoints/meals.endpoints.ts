import { baseApi } from '../baseApi';
import {
  CreateMealDto,
  ListMealsQuery,
  ReplaceMealItemsDto,
  UpdateMealDto,
} from '../types';

const M = '/nutrition/library/meals';

// Reusable tenant Meals assembled from Foods. Totals are calculated server-side.
// Coach-managed; scoped to the active tenant via x-tenant-id.
export const mealsEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createMeal: builder.mutation<any, { body: CreateMealDto; tenantId: string }>({
      query: ({ body }) => ({ url: M, method: 'POST', body }),
      invalidatesTags: (result, error, { tenantId }) => [
        { type: 'Meals', id: `LIST-${tenantId}` },
      ],
    }),
    listMeals: builder.query<any[], { tenantId: string } & ListMealsQuery>({
      query: ({ search, dietaryTag, allergen, includeInactive }) => ({
        url: M,
        params: { search, dietaryTag, allergen, includeInactive },
      }),
      providesTags: (result, error, { tenantId }) => [
        { type: 'Meals', id: `LIST-${tenantId}` },
        ...(result ?? []).map((m: any) => ({
          type: 'Meals' as const,
          id: `${tenantId}:${m.id}`,
        })),
      ],
    }),
    getMeal: builder.query<any, { mealId: string; tenantId: string }>({
      query: ({ mealId }) => `${M}/${mealId}`,
      providesTags: (result, error, { mealId, tenantId }) => [
        { type: 'Meals', id: `${tenantId}:${mealId}` },
      ],
    }),
    // Metadata only — and the restore path (`isActive: true`).
    updateMeal: builder.mutation<
      any,
      { mealId: string; body: UpdateMealDto; tenantId: string }
    >({
      query: ({ mealId, body }) => ({ url: `${M}/${mealId}`, method: 'PATCH', body }),
      invalidatesTags: (result, error, { mealId, tenantId }) => [
        { type: 'Meals', id: `LIST-${tenantId}` },
        { type: 'Meals', id: `${tenantId}:${mealId}` },
      ],
    }),
    archiveMeal: builder.mutation<any, { mealId: string; tenantId: string }>({
      query: ({ mealId }) => ({ url: `${M}/${mealId}`, method: 'DELETE' }),
      invalidatesTags: (result, error, { mealId, tenantId }) => [
        { type: 'Meals', id: `LIST-${tenantId}` },
        { type: 'Meals', id: `${tenantId}:${mealId}` },
      ],
    }),
    // PUT = transactional full replacement of the ordered recipe, not a delta.
    // Published plans already snapshotted this Meal and are NOT affected.
    replaceMealItems: builder.mutation<
      any,
      { mealId: string; body: ReplaceMealItemsDto; tenantId: string }
    >({
      query: ({ mealId, body }) => ({
        url: `${M}/${mealId}/items`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { mealId, tenantId }) => [
        { type: 'Meals', id: `LIST-${tenantId}` },
        { type: 'Meals', id: `${tenantId}:${mealId}` },
      ],
    }),
  }),
});

export const {
  useCreateMealMutation,
  useListMealsQuery,
  useLazyListMealsQuery,
  useGetMealQuery,
  useUpdateMealMutation,
  useArchiveMealMutation,
  useReplaceMealItemsMutation,
} = mealsEndpoints;
