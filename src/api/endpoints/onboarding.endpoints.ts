import { baseApi } from '../baseApi';
import { ValidateOnboardingDto, ConfirmOnboardingDto } from '../types';

export const onboardingEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    validateOnboarding: builder.mutation<any, ValidateOnboardingDto>({
      query: (body) => ({
        url: '/client/me/onboarding/validate',
        method: 'POST',
        body,
      }),
    }),
    confirmOnboarding: builder.mutation<any, ConfirmOnboardingDto>({
      query: (body) => ({
        url: '/client/me/onboarding/confirm',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Memberships', 'Tenant', 'Me', 'Intake'],
    }),
  }),
});

export const { useValidateOnboardingMutation, useConfirmOnboardingMutation } =
  onboardingEndpoints;
