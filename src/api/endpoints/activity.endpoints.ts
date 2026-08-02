import { baseApi } from '../baseApi';
import { ActivityGraphQuery, ActivityGraphResponse } from '../types';

export const activityEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Omit `year` for the rolling latest 365 days. 400 means the year is invalid.
    getActivityGraph: builder.query<ActivityGraphResponse, ActivityGraphQuery | void>({
      query: (args) => ({
        url: '/client/me/activity',
        params: args?.year ? { year: args.year } : undefined,
      }),
      providesTags: (result, error, args) => [
        { type: 'Activity', id: args?.year ?? 'ROLLING' },
      ],
    }),
  }),
});

export const { useGetActivityGraphQuery, useLazyGetActivityGraphQuery } =
  activityEndpoints;
