import api from './api';
import { LoginResponse, User } from '../types';

function cookieFlags() {
  // Secure solo aplica sobre HTTPS; en dev local (http) el navegador la descartaría
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  return `path=/; SameSite=Lax${secure}`;
}

function setAuthCookie(token: string) {
  // 7 days — refresh token handles renewal; middleware just needs to know user is logged in
  const maxAge = 7 * 24 * 60 * 60;
  document.cookie = `accessToken=${token}; max-age=${maxAge}; ${cookieFlags()}`;
}

function clearAuthCookie() {
  document.cookie = `accessToken=; max-age=0; ${cookieFlags()}`;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', { email, password });
  const { accessToken, refreshToken, user } = response.data;

  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('user', JSON.stringify(user));
  setAuthCookie(accessToken);

  return response.data;
}

export async function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: 'DADOR' | 'TRANSPORTISTA';
}): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/register', data);
  const { accessToken, refreshToken, user } = response.data;

  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('user', JSON.stringify(user));
  setAuthCookie(accessToken);

  return response.data;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // ignore network errors — clean up locally regardless
  } finally {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    clearAuthCookie();
  }
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('accessToken');
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}
