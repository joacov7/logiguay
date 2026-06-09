import api from './api';
import { LoginResponse, User } from '../types';

function setAuthCookie(token: string) {
  const maxAge = 15 * 60; // 15 minutes — matches JWT_EXPIRES_IN
  document.cookie = `accessToken=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearAuthCookie() {
  document.cookie = 'accessToken=; path=/; max-age=0; SameSite=Lax';
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
