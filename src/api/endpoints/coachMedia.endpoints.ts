import { baseApi } from '../baseApi';
import { DOCUMENT_MAX_EDGE, prepareImage } from '../imagePrep';
import { MediaUploadError, uploadFile } from '../mediaUpload';
import { CertificationInput } from '../types';

export interface AddCertificationArgs extends CertificationInput {
  /** Local URI of the certificate PDF or scan — the required `file` part. */
  fileUri: string;
}

/** Shape RTK Query's `queryFn` contract wants back on failure. */
function toQueryError(e: unknown) {
  if (e instanceof MediaUploadError) {
    return { error: { status: e.status, data: e.message } };
  }
  return {
    error: { status: 'FETCH_ERROR' as const, error: (e as Error)?.message ?? 'Upload failed' },
  };
}

export const coachMediaEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    setCoachAvatar: builder.mutation<unknown, { uri: string }>({
      queryFn: async ({ uri }) => {
        try {
          const fileUri = await prepareImage(uri);
          const data = await uploadFile({
            path: '/coaches/me/avatar',
            method: 'PUT',
            fieldName: 'avatar',
            fileUri,
          });
          return { data };
        } catch (e) {
          return toQueryError(e);
        }
      },
      invalidatesTags: ['Me'],
    }),
    deleteCoachAvatar: builder.mutation<unknown, void>({
      query: () => ({ url: '/coaches/me/avatar', method: 'DELETE' }),
      invalidatesTags: ['Me'],
    }),
    /**
     * `createUploadTask` sends exactly one file per request, so a multi-photo
     * add becomes one request per photo. That's the better shape anyway: they
     * upload in parallel and a single failure doesn't take the others with it.
     */
    addCoachTransformationPhotos: builder.mutation<unknown, { uris: string[] }>({
      queryFn: async ({ uris }) => {
        try {
          const data = await Promise.all(
            uris.map(async (uri) =>
              uploadFile({
                path: '/coaches/me/transformation-photos',
                method: 'POST',
                fieldName: 'photos',
                fileUri: await prepareImage(uri),
              })
            )
          );
          return { data };
        } catch (e) {
          return toQueryError(e);
        }
      },
      invalidatesTags: ['Me'],
    }),
    /**
     * Deletion matches on the FULL URL string, not an index or id — pass back
     * the exact value the profile response returned. 404 = not on this profile.
     */
    deleteCoachTransformationPhoto: builder.mutation<unknown, { url: string }>({
      query: ({ url }) => ({
        url: '/coaches/me/transformation-photos',
        method: 'DELETE',
        params: { url },
      }),
      invalidatesTags: ['Me'],
    }),
    // Flat metadata fields plus the required `file` part — note this is a THIRD
    // multipart convention, distinct from the JSON `data` wrapper on
    // PATCH /coaches/me.
    addCoachCertification: builder.mutation<unknown, AddCertificationArgs>({
      queryFn: async ({ fileUri, ...fields }) => {
        try {
          const data = await uploadFile({
            path: '/coaches/me/certifications',
            method: 'POST',
            fieldName: 'file',
            // Certificates are read, not glanced at — keep them larger, and
            // leave PDFs untouched (prepareImage passes non-images through).
            fileUri: await prepareImage(fileUri, { maxEdge: DOCUMENT_MAX_EDGE }),
            fields,
          });
          return { data };
        } catch (e) {
          return toQueryError(e);
        }
      },
      invalidatesTags: ['Me'],
    }),
    deleteCoachCertification: builder.mutation<unknown, { certificationId: string }>({
      query: ({ certificationId }) => ({
        url: `/coaches/me/certifications/${certificationId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Me'],
    }),
  }),
});

export const {
  useSetCoachAvatarMutation,
  useDeleteCoachAvatarMutation,
  useAddCoachTransformationPhotosMutation,
  useDeleteCoachTransformationPhotoMutation,
  useAddCoachCertificationMutation,
  useDeleteCoachCertificationMutation,
} = coachMediaEndpoints;
