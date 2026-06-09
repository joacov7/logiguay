'use client';

import React, { useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { Sidebar } from '@/components/ui/Sidebar';
import { Navbar } from '@/components/ui/Navbar';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onLogout={logout} />
      <div className="flex-1 flex flex-col ml-64 overflow-hidden">
        <Navbar user={user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
