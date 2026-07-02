'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Alert, PaginatedResponse } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AlertasPage() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [page, setPage] = useState(1);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<PaginatedResponse<Alert>>({
    queryKey: ['alertas', companyId, page, onlyUnread],
    queryFn: async () => {
      const params = new URLSearchParams({
        companyId: companyId ?? '',
        page: String(page),
        limit: '20',
        ...(onlyUnread && { unread: 'true' }),
      });
      const res = await api.get(`/alerts?${params}`);
      return res.data;
    },
    enabled: !!companyId,
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.patch(`/alerts/read-all?companyId=${companyId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alertas'] }),
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/alerts/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alertas'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertas</h1>
          <p className="text-sm text-gray-500 mt-1">Notificaciones del sistema</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOnlyUnread((v) => !v)}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              onlyUnread ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-gray-300 text-gray-600'
            }`}
          >
            Solo no leídas
          </button>
          <Button variant="outline" size="sm" onClick={() => markAllMutation.mutate()} loading={markAllMutation.isPending}>
            <CheckCheck className="h-4 w-4" />
            Marcar todas
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : !data?.data.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Bell className="h-12 w-12 mb-3 opacity-50" />
          <p className="font-medium">No hay alertas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.data.map((alert) => (
            <Card
              key={alert.id}
              className={`flex items-start gap-4 cursor-pointer hover:bg-gray-50 transition-colors ${!alert.isRead ? 'border-blue-200 bg-blue-50/30' : ''}`}
              padding="sm"
            >
              <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${alert.isRead ? 'bg-gray-300' : 'bg-blue-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">{alert.type}</span>
                    <p className="text-sm text-gray-900 mt-0.5">{alert.message}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">
                      {format(new Date(alert.createdAt), 'dd/MM HH:mm', { locale: es })}
                    </span>
                    {!alert.isRead && (
                      <button
                        onClick={() => markOneMutation.mutate(alert.id)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Leída
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Anterior
          </Button>
          <span className="text-sm text-gray-500">Página {page} de {data.pages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.pages}>
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}
