'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Truck, Package, Navigation, Bell, DollarSign, Users } from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/Card';
import api from '@/lib/api';
import { DashboardKPIs } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COMPANY_ID = 'placeholder'; // In a real app, get from auth context

export default function DashboardPage() {
  const { data: kpis, isLoading } = useQuery<DashboardKPIs>({
    queryKey: ['dashboard-kpis', COMPANY_ID],
    queryFn: async () => {
      const res = await api.get(`/dashboard/kpis?companyId=${COMPANY_ID}`);
      return res.data;
    },
    enabled: !!COMPANY_ID,
  });

  const { data: monthlyData } = useQuery<Array<{ month: string; trips: number; revenue: number }>>({
    queryKey: ['monthly-trips', COMPANY_ID],
    queryFn: async () => {
      const res = await api.get(`/dashboard/monthly-trips?companyId=${COMPANY_ID}`);
      return res.data;
    },
    enabled: !!COMPANY_ID,
  });

  const stats = [
    {
      label: 'Vehículos activos',
      value: isLoading ? '—' : `${kpis?.vehicles.active || 0}/${kpis?.vehicles.total || 0}`,
      icon: Truck,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Viajes activos',
      value: isLoading ? '—' : String(kpis?.trips.active || 0),
      icon: Navigation,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Cargas pendientes',
      value: isLoading ? '—' : String(kpis?.cargo.pending || 0),
      icon: Package,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'Choferes',
      value: isLoading ? '—' : String(kpis?.drivers.total || 0),
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Alertas sin leer',
      value: isLoading ? '—' : String(kpis?.alerts.unread || 0),
      icon: Bell,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Ingresos este mes',
      value: isLoading
        ? '—'
        : `$${(kpis?.revenue.thisMonth || 0).toLocaleString('es-AR')}`,
      icon: DollarSign,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen de operaciones</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${bg}`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </Card>
        ))}
      </div>

      {monthlyData && monthlyData.length > 0 && (
        <Card>
          <CardTitle className="mb-4">Viajes por mes</CardTitle>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="trips" fill="#2563eb" radius={[4, 4, 0, 0]} name="Viajes" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
