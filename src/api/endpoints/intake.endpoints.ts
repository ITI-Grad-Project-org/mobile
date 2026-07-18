import { baseApi } from '../baseApi';
import { CreateClientIntakeDto } from '../types';

export const intakeEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createIntake: builder.mutation<any, { body: CreateClientIntakeDto; tenantId: string }>({
      query: ({ body }) => ({
        url: '/client/me/intake',
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { tenantId }) => [{ type: 'Intake', id: tenantId }],
    }),
    getIntake: builder.query<any, { tenantId: string }>({
      query: () => '/client/me/intake',
      providesTags: (result, error, { tenantId }) => [{ type: 'Intake', id: tenantId }],
    }),
    updateIntake: builder.mutation<any, { body: Partial<CreateClientIntakeDto>; tenantId: string }>({
      query: ({ body }) => ({
        url: '/client/me/intake',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { tenantId }) => [{ type: 'Intake', id: tenantId }],
    }),
    deleteIntake: builder.mutation<any, { tenantId: string }>({
      query: () => ({
        url: '/client/me/intake',
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { tenantId }) => [{ type: 'Intake', id: tenantId }],
    }),
  }),
});

export const {
  useCreateIntakeMutation,
  useGetIntakeQuery,
  useLazyGetIntakeQuery,
  useUpdateIntakeMutation,
  useDeleteIntakeMutation,
} = intakeEndpoints;
