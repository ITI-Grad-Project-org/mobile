import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

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

/**
 * Upload a single image
 */
export async function uploadImage(uri: string, type: 'coach' | 'client'): Promise<{ url: string; key: string }> {
  const formData = new FormData();
  
  // React Native FormData expects an object with uri, name, and type
  const uriParts = uri.split('/');
  const filename = uriParts[uriParts.length - 1] || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const fileType = match ? `image/${match[1]}` : `image/jpeg`;

  formData.append('file', {
    uri,
    name: filename,
    type: fileType,
  } as any);
  
  formData.append('type', type);

  const response = await apiClient.post('/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

/**
 * Upload multiple images
 */
export async function uploadImages(uris: string[], type: 'coach' | 'client'): Promise<{ url: string; key: string }[]> {
  const formData = new FormData();

  uris.forEach((uri) => {
    const uriParts = uri.split('/');
    const filename = uriParts[uriParts.length - 1] || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const fileType = match ? `image/${match[1]}` : `image/jpeg`;

    formData.append('files', {
      uri,
      name: filename,
      type: fileType,
    } as any);
  });

  formData.append('type', type);

  const response = await apiClient.post('/upload/images', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}
