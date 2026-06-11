import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// En emulador Android, 10.0.2.2 apunta al localhost de la PC host.
// En dispositivo físico, cambiá por la IP local de tu PC (ej: 192.168.1.100).
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('no refresh token');
        const res = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = res.data;
        await AsyncStorage.multiSet([
          ['accessToken', accessToken],
          ['refreshToken', newRefresh],
        ]);
        if (original.headers) original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        // AuthGuard detectará la ausencia del token y redirigirá al login
      }
    }
    return Promise.reject(error);
  },
);

export default api;
