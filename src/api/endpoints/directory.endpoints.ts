import { baseApi } from '../baseApi';
import { DirectoryQuery } from '../types';

// Client-facing coach discovery. Both endpoints require auth.
export const directoryEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    browseDirectory: builder.query<any, DirectoryQuery | void>({
      query: (params) => ({
        url: '/coaches/directory',
        params: params ?? undefined,
      }),
      providesTags: ['Directory'],
    }),
    getDirectoryCoach: builder.query<any, string>({
      query: (tenantId) => `/coaches/directory/${tenantId}`,
      // Also 'CoachProfile': this payload carries the coach's `rating`, so a
      // review write has to refresh it alongside the summary endpoint.
      providesTags: (result, error, tenantId) => [
        { type: 'Directory', id: tenantId },
        { type: 'CoachProfile', id: tenantId },
      ],
    }),
  }),
});

export const {
  useBrowseDirectoryQuery,
  useLazyBrowseDirectoryQuery,
  useGetDirectoryCoachQuery,
  useLazyGetDirectoryCoachQuery,
} = directoryEndpoints;
