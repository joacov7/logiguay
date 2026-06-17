import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Por defecto apunta a la API de producción, que funciona desde cualquier
// dispositivo (Expo Go en celular físico, emulador, etc.).
// Para desarrollo local, definí EXPO_PUBLIC_API_URL en apps/mobile/.env:
//   - Emulador Android:  http://10.0.2.2:3001
//   - Simulador iOS/web: http://localhost:3001
//   - Celular físico:    http://<IP-de-tu-PC>:3001
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.logiguay.com.ar';

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
