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

// ───────────────────────────────────────────────────────────────────────────
// Reintentos para fallos transitorios (red caída, timeout, 5xx)
// ───────────────────────────────────────────────────────────────────────────
// Solo reintentamos peticiones idempotentes (GET/HEAD) o las marcadas
// explícitamente con `config.retry = true`. Nunca reintentamos POST/PATCH por
// defecto: podría duplicar una carga publicada o un cambio de estado.
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 800; // ms — backoff: 0.8s, 1.6s, 3.2s

type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _retryCount?: number;
  retry?: boolean;
};

function isTransient(error: AxiosError): boolean {
  // Sin respuesta = problema de red o timeout (ECONNABORTED). Reintentable.
  if (!error.response) return true;
  // 5xx y 429 (rate limit) son transitorios; 4xx son errores del cliente.
  const status = error.response.status;
  return status >= 500 || status === 429;
}

function isRetriable(config: RetryConfig | undefined, error: AxiosError): boolean {
  if (!config) return false;
  const method = (config.method ?? 'get').toLowerCase();
  const idempotent = method === 'get' || method === 'head';
  if (!idempotent && config.retry !== true) return false;
  return isTransient(error);
}

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
    const original = error.config as RetryConfig | undefined;

    // 1) Refresh de token en 401 (una sola vez)
    if (error.response?.status === 401 && original && !original._retry) {
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
        return Promise.reject(error);
      }
    }

    // 2) Reintento con backoff exponencial para fallos transitorios
    if (isRetriable(original, error)) {
      original!._retryCount = (original!._retryCount ?? 0) + 1;
      if (original!._retryCount <= MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY * 2 ** (original!._retryCount - 1);
        await new Promise((r) => setTimeout(r, delay));
        return api(original!);
      }
    }

    return Promise.reject(error);
  },
);

/**
 * Convierte cualquier error de axios en un mensaje claro para el usuario.
 * Distingue tres casos que antes se confundían en un genérico "Error":
 *   - Sin conexión / timeout  → el usuario sabe que es la red, no la app
 *   - Mensaje del backend      → respeta el texto que envía la API
 *   - Caso desconocido         → fallback seguro
 */
export function getApiErrorMessage(error: unknown, fallback = 'Algo salió mal. Intentá de nuevo.'): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return 'La conexión tardó demasiado. Revisá tu señal e intentá de nuevo.';
      }
      return 'Sin conexión a internet. Verificá tu red e intentá de nuevo.';
    }
    const data = error.response.data as { message?: string | string[] } | undefined;
    const msg = data?.message;
    if (Array.isArray(msg)) return msg[0] ?? fallback;
    if (typeof msg === 'string' && msg) return msg;
    if (error.response.status >= 500) {
      return 'El servidor tuvo un problema. Intentá en unos segundos.';
    }
  }
  return fallback;
}

/** True si el error proviene de una falla de red (no del servidor). */
export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}

export default api;
