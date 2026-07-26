import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.74.162.148.3.nip.io';

// eslint-disable-next-line import/no-named-as-default-member
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});


// Request interceptor: attach accessToken
apiClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: on 401, try to refresh once
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const persona = await SecureStore.getItemAsync('persona') as 'coach' | 'customer' | null;
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        
        if (persona && refreshToken) {
          const refreshPath = persona === 'coach' ? '/auth/refresh' : '/auth/customer/refresh';
          
          const response = await axios.post(`${BASE_URL}${refreshPath}`, {}, {
            headers: { Authorization: `Bearer ${refreshToken}` }
          });
          
          if (response.data) {
            const { accessToken, refreshToken: newRefreshToken } = response.data;
            await SecureStore.setItemAsync('accessToken', accessToken);
            await SecureStore.setItemAsync('refreshToken', newRefreshToken);
            
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return apiClient(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh token failed, clear everything
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        await SecureStore.deleteItemAsync('persona');
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

function guessMimeType(uri: string): string {
  const match = /\.(\w+)$/.exec(uri);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    default:
      return 'image/jpeg';
  }
}

/**
 * A non-2xx from `/upload/*`. Carries the status and the API's own `message`
 * so callers can show why it failed — a 500 from the storage backend and a 401
 * are very different problems, and "upload failed" tells nobody which it was.
 */
export class UploadError extends Error {
  readonly status: number;

  constructor(status: number, body?: string) {
    let detail = body?.trim() ?? '';
    try {
      const parsed = JSON.parse(detail);
      if (parsed && typeof parsed.message === 'string') detail = parsed.message;
    } catch {
      // Not JSON (an HTML error page or empty body) — keep the raw text.
    }
    super(detail ? `Upload failed (${status}): ${detail}` : `Upload failed (${status})`);
    this.name = 'UploadError';
    this.status = status;
  }
}

/**
 * Upload a single local image file to `/upload/image` and return `{ url, key }`.
 *
 * Uses `expo-file-system`'s native multipart upload rather than a JS
 * `FormData` + fetch/axios request: RN's JS FormData transport is unreliable for
 * file uploads (bare "Network Error" / mangled multipart body). `uploadAsync`
 * streams the file natively and sets the boundary correctly. This is also what
 * docs/07-Uply-endpoints.md recommends.
 */
export async function uploadImage(
  uri: string,
  type: 'coach' | 'client'
): Promise<{ url: string; key: string }> {
  const token = await SecureStore.getItemAsync('accessToken');

  const res = await FileSystem.uploadAsync(`${BASE_URL}/upload/image`, uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType: guessMimeType(uri),
    parameters: { type },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (res.status < 200 || res.status >= 300) {
    throw new UploadError(res.status, res.body);
  }

  return JSON.parse(res.body) as { url: string; key: string };
}

/**
 * Upload multiple local images. `uploadAsync` sends one file per request, so
 * this uploads them in parallel and collects the results.
 */
export async function uploadImages(
  uris: string[],
  type: 'coach' | 'client'
): Promise<{ url: string; key: string }[]> {
  return Promise.all(uris.map((uri) => uploadImage(uri, type)));
}
