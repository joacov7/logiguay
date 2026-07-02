'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from '@/i18n/routing';
import { User } from '../types';
import { getCurrentUser, login, logout, register, isAuthenticated } from '../lib/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setUser(getCurrentUser());
    setLoading(false);
  }, []);

  const handleLogin = useCallback(
    async (email: string, password: string, redirectTo?: string) => {
      setLoading(true);
      try {
        const response = await login(email, password);
        setUser(response.user);
        // Solo rutas relativas internas: evita open-redirect con ?redirect=
        const safe = redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//');
        router.push(safe ? (redirectTo as any) : '/dashboard');
        return response;
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  const handleRegister = useCallback(
    async (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      role?: 'DADOR' | 'TRANSPORTISTA';
    }) => {
      setLoading(true);
      try {
        const response = await register(data);
        setUser(response.user);
        router.push('/dashboard');
        return response;
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  const handleLogout = useCallback(async () => {
    setLoading(true);
    try {
      await logout();
      setUser(null);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const authed = typeof window !== 'undefined' ? isAuthenticated() : false;

  return {
    user,
    loading,
    isAuthenticated: authed,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  };
}
