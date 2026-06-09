'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Bell, User } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { User as UserType, Alert } from '../../types';
import { LanguageSelector } from './LanguageSelector';
import { api } from '@/lib/api';

interface NavbarProps {
  user?: UserType | null;
  unreadAlerts?: number;
}

export function Navbar({ user, unreadAlerts = 0 }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const companyId = (user as any)?.companyId as string | undefined;

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ['navbar-alerts', companyId],
    queryFn: async () => {
      const res = await api.get(`/alerts?companyId=${companyId}&limit=10`);
      return res.data?.data ?? res.data ?? [];
    },
    enabled: !!companyId && open,
    staleTime: 30_000,
  });

  const { data: allAlerts = [] } = useQuery<Alert[]>({
    queryKey: ['navbar-alerts-count', companyId],
    queryFn: async () => {
      const res = await api.get(`/alerts?companyId=${companyId}&limit=50`);
      return res.data?.data ?? res.data ?? [];
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  const actualUnread = allAlerts.filter((a) => !a.isRead).length;
  const badgeCount = companyId ? actualUnread : unreadAlerts;

  const markAllRead = useMutation({
    mutationFn: () => api.patch(`/alerts/read-all?companyId=${companyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['navbar-alerts', companyId] });
      queryClient.invalidateQueries({ queryKey: ['navbar-alerts-count', companyId] });
    },
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <LanguageSelector />

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="h-5 w-5" />
            {badgeCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {badgeCount > 9 ? '9+' : badgeCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-900">Notificaciones</span>
                {companyId && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    disabled={markAllRead.isPending || actualUnread === 0}
                    className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40 transition-colors"
                  >
                    Marcar todas como leídas
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                {alerts.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-500 text-center">
                    No hay notificaciones recientes.
                  </p>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`px-4 py-3 flex flex-col gap-0.5 ${!alert.isRead ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                          {alert.type}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{alert.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
          <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          {user && (
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
