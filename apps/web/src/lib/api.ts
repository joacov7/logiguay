import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Single-flight del refresh: con varias queries en paralelo devolviendo 401,
// solo el primero dispara POST /auth/refresh; el resto espera la misma promesa.
// Sin esto, el backend rota el refresh token en el primer refresh y los demás
// fallan con el token ya consumido → logout espurio.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');

      const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      // Keep middleware cookie in sync
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `accessToken=${accessToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${secure}`;
      return accessToken as string;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const accessToken = await refreshAccessToken();
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `accessToken=; max-age=0; path=/; SameSite=Lax${secure}`;
        // Preservar el locale actual al redirigir (/es/... → /es/login)
        const locale = window.location.pathname.split('/')[1];
        const prefix = locale && locale.length === 2 ? `/${locale}` : '';
        window.location.href = `${prefix}/login`;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
