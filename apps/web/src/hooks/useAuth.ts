'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from '@/i18n/routing';
import { User } from '../types';
import { getCurrentUser, login, logout, register, isAuthenticated } from '../lib/auth';

function getInitialUser(): User | null {
  if (typeof window === 'undefined') return null;
  return getCurrentUser();
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(getInitialUser);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const response = await login(email, password);
        setUser(response.user);
        router.push('/dashboard');
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

  return {
    user,
    loading,
    isAuthenticated: isAuthenticated(),
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  };
}
