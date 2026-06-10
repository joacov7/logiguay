'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, ShieldAlert, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

type SubscriptionStatus = 'ACTIVA' | 'VENCIDA' | 'CANCELADA';

const STATUS_COLORS: Record<SubscriptionStatus, string> = {
  ACTIVA: 'bg-green-100 text-green-700',
  VENCIDA: 'bg-red-100 text-red-700',
  CANCELADA: 'bg-gray-100 text-gray-600',
};

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrency(amount?: number) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

export default function AdminSuscripcionesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [renewingId, setRenewingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<any[]>({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const res = await api.get('/admin/subscriptions');
      return res.data?.data ?? res.data ?? [];
    },
  });

  if (user && user.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-gray-800">Acceso denegado</h2>
      </div>
    );
  }

  const subscriptions: any[] = data ?? [];
  const filtered = statusFilter
    ? subscriptions.filter((s) => s.status === statusFilter)
    : subscriptions;

  const handleRenew = async (sub: any) => {
    setRenewingId(sub.id);
    try {
      const newEndDate = new Date();
      newEndDate.setMonth(newEndDate.getMonth() + 1);
      await api.patch(`/admin/subscriptions/${sub.id}`, {
        endDate: newEndDate.toISOString(),
        status: 'ACTIVA',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    } catch {
      alert('Error al renovar suscripción.');
    } finally {
      setRenewingId(null);
    }
  };

  const statuses: SubscriptionStatus[] = ['ACTIVA', 'VENCIDA', 'CANCELADA'];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 text-blue-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suscripciones</h1>
          <p className="text-sm text-gray-500">
            {isLoading ? 'Cargando…' : `${filtered.length} suscripción${filtered.length !== 1 ? 'es' : ''}`}
          </p>
        </div>
      </div>

      <Card padding="sm">
        <div className="flex items-center gap-3 px-2 py-2 mb-4">
          <label className="text-sm text-gray-600 font-medium">Filtrar por estado:</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse bg-gray-100 rounded" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-red-500 p-4">Error al cargar las suscripciones.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 p-4">No se encontraron suscripciones.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <span className="font-medium">
                      {sub.company?.name ?? sub.companyId ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {sub.planType ?? sub.plan ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_COLORS[(sub.status as SubscriptionStatus)] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-500">{formatDate(sub.startDate)}</TableCell>
                  <TableCell className="text-gray-500">{formatDate(sub.endDate)}</TableCell>
                  <TableCell>{formatCurrency(sub.amount)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={renewingId === sub.id}
                      onClick={() => handleRenew(sub)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Renovar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
