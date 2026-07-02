'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, routing } from '@/i18n/routing';
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
        // (// y /\ se resuelven como URL absoluta en el navegador).
        const safe = redirectTo && /^\/(?![/\\])/.test(redirectTo);
        // El middleware genera ?redirect= con el locale incluido (/es/viajes),
        // pero este router de next-intl lo vuelve a anteponer: lo quitamos.
        let target = safe ? (redirectTo as string) : '/dashboard';
        const localeMatch = target.match(/^\/([a-z]{2})(\/|$)/);
        if (localeMatch && (routing.locales as readonly string[]).includes(localeMatch[1])) {
          target = target.slice(localeMatch[1].length + 1) || '/dashboard';
        }
        router.push(target as any);
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
