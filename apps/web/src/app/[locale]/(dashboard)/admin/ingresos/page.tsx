'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, DollarSign, Calendar, Clock, CheckCircle, ShieldAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PAGADA: 'success',
  PENDIENTE: 'warning',
  CANCELADA: 'danger',
};

interface RevenueSummary {
  total: number;
  totalCount: number;
  month: number;
  monthCount: number;
  year: number;
  yearCount: number;
  byStatus: { status: string; _sum: { amount: number }; _count: number }[];
  byPlan: { planType: string; _count: number }[];
  monthly: { month: number; total: number; count: number }[];
  recent: {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    company: { id: string; name: string; planType: string } | null;
    trip: { id: string; agreedRate: number; status: string } | null;
  }[];
}

export default function AdminIngresosPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');

  if (user && user.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-gray-800">Acceso denegado</h2>
        <p className="text-gray-500">No tenés permisos para acceder a esta sección.</p>
      </div>
    );
  }

  const summaryQuery = useQuery<RevenueSummary>({
    queryKey: ['admin-revenue-summary'],
    queryFn: async () => (await api.get('/billing/admin/resumen')).data,
    staleTime: 60_000,
  });

  const comisionesQuery = useQuery<{ data: RevenueSummary['recent']; total: number; pages: number }>({
    queryKey: ['admin-comisiones', statusFilter],
    queryFn: async () =>
      (await api.get('/billing/admin/comisiones', { params: { limit: 50, status: statusFilter || undefined } })).data,
    staleTime: 30_000,
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/billing/admin/invoice/${id}/pay`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-revenue-summary'] });
      queryClient.invalidateQueries({ queryKey: ['admin-comisiones'] });
    },
  });

  const summary = summaryQuery.data;
  const comisiones = comisionesQuery.data?.data ?? [];

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const found = summary?.monthly.find((m) => m.month === i + 1);
    return { month: MONTH_NAMES[i], total: found?.total ?? 0, count: found?.count ?? 0 };
  });

  const pendingAmount =
    summary?.byStatus.find((s) => s.status === 'PENDIENTE')?._sum.amount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ingresos de la plataforma</h1>
          <p className="text-sm text-gray-500">Comisiones cobradas sobre viajes finalizados</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total acumulado', value: fmt(summary?.total ?? 0), icon: DollarSign, sub: `${summary?.totalCount ?? 0} operaciones` },
          { label: 'Este mes', value: fmt(summary?.month ?? 0), icon: Calendar, sub: `${summary?.monthCount ?? 0} este mes` },
          { label: 'Este año', value: fmt(summary?.year ?? 0), icon: TrendingUp, sub: `${summary?.yearCount ?? 0} este año` },
          { label: 'Pendiente de cobro', value: fmt(pendingAmount), icon: Clock, sub: 'Por facturar' },
        ].map(({ label, value, icon: Icon, sub }) => (
          <Card key={label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Icon className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Monthly chart */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Ingresos mensuales ({new Date().getFullYear()})</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(v: number) => [fmt(v), 'Ingresos']}
              contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
            />
            <Bar dataKey="total" fill="#15A66A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Plan distribution */}
      {summary?.byPlan && summary.byPlan.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Empresas por plan</h2>
          <div className="flex flex-wrap gap-3">
            {summary.byPlan.map((p) => (
              <div key={p.planType} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm">
                <span className="font-medium text-gray-700">{p.planType}</span>
                <Badge variant="default">{p._count}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Transactions table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Comisiones</h2>
          <div className="flex gap-2">
            {['', 'PENDIENTE', 'PAGADA', 'CANCELADA'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {s || 'Todas'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="pb-2 font-medium">Empresa</th>
                <th className="pb-2 font-medium">Plan</th>
                <th className="pb-2 font-medium">Tarifa viaje</th>
                <th className="pb-2 font-medium">Comisión</th>
                <th className="pb-2 font-medium">Estado</th>
                <th className="pb-2 font-medium">Fecha</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {comisiones.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 font-medium text-gray-800">{inv.company?.name ?? '—'}</td>
                  <td className="py-2.5 text-gray-500">{inv.company?.planType ?? '—'}</td>
                  <td className="py-2.5 text-gray-600">{inv.trip ? fmt(inv.trip.agreedRate) : '—'}</td>
                  <td className="py-2.5 font-semibold text-gray-900">{fmt(inv.amount)}</td>
                  <td className="py-2.5">
                    <Badge variant={STATUS_VARIANT[inv.status] ?? 'default'}>{inv.status}</Badge>
                  </td>
                  <td className="py-2.5 text-gray-400 text-xs">
                    {new Date(inv.createdAt).toLocaleDateString('es-AR')}
                  </td>
                  <td className="py-2.5">
                    {inv.status === 'PENDIENTE' && (
                      <button
                        onClick={() => markPaidMutation.mutate(inv.id)}
                        disabled={markPaidMutation.isPending}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Cobrada
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {comisiones.length === 0 && !comisionesQuery.isLoading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400 text-sm">
                    Sin comisiones registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
