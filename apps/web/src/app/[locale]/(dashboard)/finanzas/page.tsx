'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, DollarSign, Clock, Truck,
  AlertCircle, ChevronRight, Info,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

const MONTH_NAMES: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
};

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n);
}

function shortMonth(key: string) {
  const [, m] = key.split('-');
  return MONTH_NAMES[m] ?? key;
}

interface FinanzasData {
  ingresosEsteMes: number;
  ingresosMesAnterior: number;
  viajesEsteMes: number;
  ingresosAcumulados: number;
  totalViajes: number;
  pendienteAmount: number;
  pendienteCount: number;
  ivaDebitoEstimado: number;
  mensual: { month: string; total: number }[];
  topViajes: {
    id: string; agreedRate: number; plate?: string;
    origin?: string; destination?: string; cargoType?: string;
  }[];
  porVehiculo: { plate: string; total: number; viajes: number }[];
}

export default function FinanzasPage() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  const { data, isLoading } = useQuery<FinanzasData>({
    queryKey: ['finanzas-resumen', companyId],
    enabled: !!companyId,
    queryFn: async () => (await api.get('/billing/finanzas/resumen')).data,
    staleTime: 5 * 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const variacion = data.ingresosMesAnterior > 0
    ? ((data.ingresosEsteMes - data.ingresosMesAnterior) / data.ingresosMesAnterior) * 100
    : 0;
  const subiendo = variacion >= 0;

  const maxBar = Math.max(...data.mensual.map((m) => m.total), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Finanzas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Resumen de ingresos basado en tus viajes finalizados
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ingresos este mes */}
        <Card>
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500">Ingresos este mes</p>
            <p className="text-2xl font-extrabold text-gray-900">{fmt(data.ingresosEsteMes)}</p>
            <div className="flex items-center gap-1.5">
              {subiendo
                ? <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                : <TrendingDown className="h-3.5 w-3.5 text-orange-500" />}
              <span className={`text-xs font-medium ${subiendo ? 'text-green-600' : 'text-orange-600'}`}>
                {subiendo ? '+' : ''}{variacion.toFixed(1)}% vs mes anterior
              </span>
            </div>
            <p className="text-xs text-gray-400">{data.viajesEsteMes} viajes facturados</p>
          </div>
        </Card>

        {/* Acumulado total */}
        <Card>
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500">Total acumulado</p>
            <p className="text-2xl font-extrabold text-gray-900">{fmt(data.ingresosAcumulados)}</p>
            <p className="text-xs text-gray-400">{data.totalViajes} viajes en total</p>
          </div>
        </Card>

        {/* Pendiente de cobro */}
        <Card>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-400" />
              <p className="text-xs font-medium text-gray-500">Pendiente de cobro</p>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{fmt(data.pendienteAmount)}</p>
            <p className="text-xs text-gray-400">{data.pendienteCount} facturas sin cobrar</p>
          </div>
        </Card>

        {/* IVA estimado */}
        <Card>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-gray-500">IVA débito estimado</p>
              <div className="group relative">
                <Info className="h-3.5 w-3.5 text-gray-300 cursor-help" />
                <div className="absolute bottom-5 right-0 w-56 bg-gray-900 text-white text-xs rounded-lg p-2.5 hidden group-hover:block z-10 leading-relaxed">
                  Estimación orientativa: 10,5% (tasa reducida de transporte de carga). Consultá con tu contador para la declaración oficial.
                </div>
              </div>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{fmt(data.ivaDebitoEstimado)}</p>
            <p className="text-xs text-orange-500 font-medium">⚠ Orientativo — tasa 10,5%</p>
          </div>
        </Card>
      </div>

      {/* IVA disclaimer */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 leading-relaxed">
          <span className="font-semibold">IVA orientativo.</span> El transporte de carga tributa al 10,5% (tasa reducida).
          Este número te da una idea de cuánto separar para la declaración, pero el monto exacto depende de tus créditos fiscales y retenciones.
          Siempre consultá con tu contador antes de presentar.
        </p>
      </div>

      {/* Chart + vehicles */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Monthly bar chart */}
        <Card className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Ingresos últimos 6 meses</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.mensual} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="month"
                tickFormatter={shortMonth}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v: number) => [fmt(v), 'Ingresos']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {data.mensual.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.total === maxBar ? '#15A66A' : '#b8ebd1'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Revenue by vehicle */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Truck className="h-4 w-4 text-gray-400" /> Por vehículo
          </h2>
          {data.porVehiculo.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin datos aún</p>
          ) : (
            <div className="space-y-3">
              {data.porVehiculo.map((v, i) => (
                <div key={v.plate} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-800">{v.plate}</span>
                      <span className="text-sm font-bold text-gray-900">{fmt(v.total)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(v.total / (data.porVehiculo[0]?.total || 1)) * 100}%`,
                          backgroundColor: '#15A66A',
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{v.viajes} viajes</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Top trips */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-gray-400" /> Tus viajes mejor pagados
        </h2>
        {data.topViajes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Completá tu primer viaje para ver estadísticas
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.topViajes.map((t) => (
              <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {t.plate && (
                      <Badge variant="default">{t.plate}</Badge>
                    )}
                    {t.cargoType && (
                      <span className="text-xs text-gray-400">{t.cargoType}</span>
                    )}
                  </div>
                  {t.origin && t.destination && (
                    <p className="text-sm text-gray-600 mt-1 truncate">
                      {t.origin}
                      <ChevronRight className="h-3 w-3 inline mx-1 text-gray-300" />
                      {t.destination}
                    </p>
                  )}
                </div>
                <p className="text-base font-bold text-gray-900 shrink-0">{fmt(t.agreedRate)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
