import { baseApi } from '../baseApi';
import { CreateFoodDto, ListFoodsQuery, UpdateFoodDto } from '../types';

const F = '/nutrition/library/foods';

// Per-tenant Food library — the atoms Meals and nutrition plans are built from.
// Coach-managed; all endpoints are scoped to the active tenant via x-tenant-id.
export const foodsEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createFood: builder.mutation<any, { body: CreateFoodDto; tenantId: string }>({
      query: ({ body }) => ({ url: F, method: 'POST', body }),
      invalidatesTags: (result, error, { tenantId }) => [
        { type: 'Foods', id: `LIST-${tenantId}` },
      ],
    }),
    listFoods: builder.query<any[], { tenantId: string } & ListFoodsQuery>({
      query: ({ search, servingUnit, dietaryTag, allergen, includeInactive }) => ({
        url: F,
        params: { search, servingUnit, dietaryTag, allergen, includeInactive },
      }),
      providesTags: (result, error, { tenantId }) => [
        { type: 'Foods', id: `LIST-${tenantId}` },
        ...(result ?? []).map((f: any) => ({
          type: 'Foods' as const,
          id: `${tenantId}:${f.id}`,
        })),
      ],
    }),
    getFood: builder.query<any, { foodId: string; tenantId: string }>({
      query: ({ foodId }) => `${F}/${foodId}`,
      providesTags: (result, error, { foodId, tenantId }) => [
        { type: 'Foods', id: `${tenantId}:${foodId}` },
      ],
    }),
    // Also the restore path: PATCH with `isActive: true` un-archives a Food.
    // A 409 on create ("duplicate normalized name+brand") usually means the
    // archived original is still there — offer to restore it instead.
    updateFood: builder.mutation<
      any,
      { foodId: string; body: UpdateFoodDto; tenantId: string }
    >({
      query: ({ foodId, body }) => ({ url: `${F}/${foodId}`, method: 'PATCH', body }),
      invalidatesTags: (result, error, { foodId, tenantId }) => [
        { type: 'Foods', id: `LIST-${tenantId}` },
        { type: 'Foods', id: `${tenantId}:${foodId}` },
        // Meals snapshot Foods, but their calculated totals read live.
        { type: 'Meals', id: `LIST-${tenantId}` },
      ],
    }),
    archiveFood: builder.mutation<any, { foodId: string; tenantId: string }>({
      query: ({ foodId }) => ({ url: `${F}/${foodId}`, method: 'DELETE' }),
      invalidatesTags: (result, error, { foodId, tenantId }) => [
        { type: 'Foods', id: `LIST-${tenantId}` },
        { type: 'Foods', id: `${tenantId}:${foodId}` },
      ],
    }),
  }),
});

export const {
  useCreateFoodMutation,
  useListFoodsQuery,
  useLazyListFoodsQuery,
  useGetFoodQuery,
  useUpdateFoodMutation,
  useArchiveFoodMutation,
} = foodsEndpoints;
