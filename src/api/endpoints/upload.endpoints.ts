import { baseApi } from '../baseApi';

export const uploadEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    deleteUploadedFile: builder.mutation<any, { key: string }>({
      query: ({ key }) => ({
        url: `/upload/${key}`,
        method: 'DELETE',
      }),
    }),
  }),
});

export const { useDeleteUploadedFileMutation } = uploadEndpoints;
export { uploadImage, uploadImages } from '../client';
