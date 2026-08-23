import { baseApi } from '../baseApi';
import { appendFields, appendFile, appendFiles } from '../formData';
import { ClientProfileFields, CoachProfileData } from '../types';

export interface UpdateCoachProfileArgs {
  /** Profile fields — sent as one JSON-encoded `data` part. */
  data: CoachProfileData;
  avatarUri?: string;
  transformationUris?: string[];
  certificateUris?: (string | undefined)[];
}

export interface UpdateClientProfileArgs extends ClientProfileFields {
  /** Local URI for the `avatar` part; replaced the old `avatarUrl` string. */
  avatarUri?: string;
}

export const profileEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCoachProfile: builder.query<any, void>({
      query: () => '/coaches/me',
      providesTags: ['Me'],
    }),
    // multipart/form-data: fields wrapped in a JSON `data` part, files alongside.
    updateCoachProfile: builder.mutation<any, UpdateCoachProfileArgs>({
      query: ({ data, avatarUri, transformationUris, certificateUris }) => {
        const form = new FormData();
        form.append('data', JSON.stringify(data));
        appendFile(form, 'avatar', avatarUri, 'avatar.jpg');
        appendFiles(form, 'transformationPhotos', transformationUris, 'transformation');
        appendFiles(form, 'certificateFiles', certificateUris, 'certificate');
        return { url: '/coaches/me', method: 'PATCH', body: form };
      },
      invalidatesTags: ['Me'],
    }),
    deleteCoachProfile: builder.mutation<any, void>({
      query: () => ({
        url: '/coaches/me',
        method: 'DELETE',
      }),
      invalidatesTags: ['Me'],
    }),
    getCoachById: builder.query<any, string>({
      query: (id) => `/coaches/${id}`,
    }),
    getPublicCoachProfile: builder.query<any, string>({
      query: (tenantId) => `/coaches/${tenantId}/profile`,
      // Documented as "public profile with rating & reviews" — same aggregate
      // the client's own review counts into.
      providesTags: (result, error, tenantId) => [{ type: 'CoachProfile', id: tenantId }],
    }),
    getClientProfile: builder.query<any, void>({
      query: () => '/clients/me',
      providesTags: ['Me'],
    }),
    // multipart/form-data too, but FLAT fields — no `data` wrapper. The two
    // conventions differ on purpose; don't share a helper between them.
    updateClientProfile: builder.mutation<any, UpdateClientProfileArgs>({
      query: ({ avatarUri, ...fields }) => {
        const form = new FormData();
        appendFields(form, fields);
        appendFile(form, 'avatar', avatarUri, 'avatar.jpg');
        return { url: '/clients/me', method: 'PATCH', body: form };
      },
      invalidatesTags: ['Me'],
    }),
    deleteClientProfile: builder.mutation<any, void>({
      query: () => ({
        url: '/clients/me',
        method: 'DELETE',
      }),
      invalidatesTags: ['Me'],
    }),
  }),
});

export const {
  useGetCoachProfileQuery,
  useLazyGetCoachProfileQuery,
  useUpdateCoachProfileMutation,
  useDeleteCoachProfileMutation,
  useGetCoachByIdQuery,
  useGetPublicCoachProfileQuery,
  useGetClientProfileQuery,
  useLazyGetClientProfileQuery,
  useUpdateClientProfileMutation,
  useDeleteClientProfileMutation,
} = profileEndpoints;
