import { baseApi } from '../baseApi';
import {
  RegisterCoachDto,
  LoginDto,
  CreateClientDto,
  GoogleAuthDto,
  SwitchTenantDto,
  Membership,
} from '../types';

export const authEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    registerCoach: builder.mutation<any, RegisterCoachDto>({
      query: (body) => ({
        url: '/auth/register',
        method: 'POST',
        body,
      }),
    }),
    loginCoach: builder.mutation<any, LoginDto>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
    }),
    registerCustomer: builder.mutation<any, CreateClientDto>({
      query: (body) => ({
        url: '/auth/customer/register',
        method: 'POST',
        body,
      }),
    }),
    loginCustomer: builder.mutation<any, LoginDto>({
      query: (body) => ({
        url: '/auth/customer/login',
        method: 'POST',
        body,
      }),
    }),
    googleCustomerLogin: builder.mutation<any, GoogleAuthDto>({
      query: (body) => ({
        url: '/auth/customer/google',
        method: 'POST',
        body,
      }),
    }),
    getCoachMe: builder.query<any, void>({
      query: () => '/auth/me',
      providesTags: ['Me'],
    }),
    getCustomerMe: builder.query<any, void>({
      query: () => '/auth/customer/me',
      providesTags: ['Me'],
    }),
    getCustomerMemberships: builder.query<Membership[], void>({
      query: () => '/auth/customer/memberships',
      providesTags: ['Memberships'],
    }),
    switchTenant: builder.mutation<any, SwitchTenantDto>({
      query: (body) => ({
        url: '/auth/customer/switch-tenant',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Me', 'Tenant', 'Clients', 'Intake', 'Measurements', 'Invitations', 'Reviews'],
    }),
    forgotPasswordCoach: builder.mutation<any, { email: string }>({
      query: (body) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body,
      }),
    }),
    resetPasswordCoach: builder.mutation<any, { token: string; newPassword: string }>({
      query: (body) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body,
      }),
    }),
    forgotPasswordCustomer: builder.mutation<any, { email: string }>({
      query: (body) => ({
        url: '/auth/customer/forgot-password',
        method: 'POST',
        body,
      }),
    }),
    resetPasswordCustomer: builder.mutation<any, { token: string; newPassword: string }>({
      query: (body) => ({
        url: '/auth/customer/reset-password',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useRegisterCoachMutation,
  useLoginCoachMutation,
  useRegisterCustomerMutation,
  useLoginCustomerMutation,
  useGoogleCustomerLoginMutation,
  useGetCoachMeQuery,
  useLazyGetCoachMeQuery,
  useGetCustomerMeQuery,
  useLazyGetCustomerMeQuery,
  useGetCustomerMembershipsQuery,
  useLazyGetCustomerMembershipsQuery,
  useSwitchTenantMutation,
  useForgotPasswordCoachMutation,
  useResetPasswordCoachMutation,
  useForgotPasswordCustomerMutation,
  useResetPasswordCustomerMutation,
} = authEndpoints;
