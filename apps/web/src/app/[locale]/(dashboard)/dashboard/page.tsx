'use client';

import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Navigation,
  DollarSign,
  Truck,
  Package,
  Bell,
  Clock,
  AlertTriangle,
  FileDown,
  ChevronDown,
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/lib/export';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import KpiCard from '@/components/ui/KpiCard';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from 'next-intl';
import { useDollarRates, useGrainPrices, useWeather } from '@/hooks/useMarketData';

interface DashboardStats {
  trips: {
    active: number;
    finalized: number;
    cancelled: number;
    thisMonth: number;
    lastMonth: number;
    byStatus: Record<string, number>;
  };
  cargo: {
    total: number;
    published: number;
    marketplace: number;
    thisMonth: number;
  };
  billing: {
    totalRevenue: number;
    pendingRevenue: number;
    totalCommissions: number;
    pendingCommissions: number;
    thisMonth: number;
    lastMonth: number;
  };
  fleet: {
    total: number;
    active: number;
    onTrip: number;
    utilization: number;
  };
  drivers: {
    total: number;
    active: number;
    onTrip: number;
  };
  logistics: {
    avgDeliveryHours: number;
    totalWeightTons: number;
    alertsUnread: number;
  };
  recentTrips: Array<{
    id: string;
    status: string;
    agreedRate?: number;
    cargo?: { type?: string; originAddress?: string; destinationAddress?: string };
    vehicle?: { plate?: string };
    driver?: { user?: { firstName?: string; lastName?: string } };
  }>;
  expiringDocuments: Array<{
    id: string;
    type: string;
    entityType: string;
    entityId: string;
    expiresAt: string;
  }>;
}

interface TimeSeriesEntry {
  month: string;
  trips: number;
  revenue: number;
}

const TRIP_STATUS_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  PUBLICADO: 'Publicado',
  COTIZANDO: 'Cotizando',
  ASIGNADO: 'Asignado',
  EN_CAMINO_ORIGEN: 'En camino',
  EN_CARGA: 'En carga',
  EN_TRANSITO: 'En tránsito',
  EN_DESCARGA: 'En descarga',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

const TRIP_STATUS_COLORS: Record<string, string> = {
  FINALIZADO: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-red-100 text-red-800',
  EN_TRANSITO: 'bg-blue-100 text-blue-800',
  EN_CARGA: 'bg-yellow-100 text-yellow-800',
  EN_DESCARGA: 'bg-orange-100 text-orange-800',
  ASIGNADO: 'bg-indigo-100 text-indigo-800',
  EN_CAMINO_ORIGEN: 'bg-cyan-100 text-cyan-800',
  PENDIENTE: 'bg-gray-100 text-gray-700',
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
}

function formatMonth(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return format(new Date(year, month - 1), 'MMM', { locale: es });
}

function daysUntil(dateStr: string) {
  const target = new Date(dateStr);
  const today = new Date();
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const t = useTranslations('dashboard');
  const companyId = (user as any)?.companyId as string | undefined;
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    if (exportOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportOpen]);

  const handleExportExcel = () => {
    if (!stats) return;
    exportToExcel([
      { Métrica: 'Viajes activos', Valor: stats.trips.active },
      { Métrica: 'Viajes este mes', Valor: stats.trips.thisMonth },
      { Métrica: 'Viajes finalizados', Valor: stats.trips.finalized },
      { Métrica: 'Cargas totales', Valor: stats.cargo.total },
      { Métrica: 'Cargas publicadas', Valor: stats.cargo.published },
      { Métrica: 'Ingresos pendientes (ARS)', Valor: stats.billing.pendingRevenue },
      { Métrica: 'Ingresos este mes (ARS)', Valor: stats.billing.thisMonth },
      { Métrica: 'Vehículos activos', Valor: stats.fleet.active },
      { Métrica: 'Utilización flota %', Valor: stats.fleet.utilization },
      { Métrica: 'Alertas no leídas', Valor: stats.logistics.alertsUnread },
    ], `dashboard-${new Date().toISOString().slice(0, 10)}`, 'Dashboard');
    setExportOpen(false);
  };

  const handleExportPDF = async () => {
    if (!stats) return;
    await exportToPDF(
      'Resumen del Dashboard',
      ['Métrica', 'Valor'],
      [[
        ['Viajes activos', stats.trips.active],
        ['Viajes este mes', stats.trips.thisMonth],
        ['Viajes finalizados', stats.trips.finalized],
        ['Cargas totales', stats.cargo.total],
        ['Ingresos pendientes (ARS)', stats.billing.pendingRevenue],
        ['Ingresos este mes (ARS)', stats.billing.thisMonth],
        ['Utilización flota %', `${stats.fleet.utilization}%`],
        ['Alertas no leídas', stats.logistics.alertsUnread],
      ]],
      `dashboard-${new Date().toISOString().slice(0, 10)}`,
    );
    setExportOpen(false);
  };
  const role = user?.role;

  const queryParams = new URLSearchParams();
  if (companyId) queryParams.set('companyId', companyId);
  if (role) queryParams.set('role', role);
  const qStr = queryParams.toString();

  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      const res = await api.get(`/dashboard/stats${qStr ? `?${qStr}` : ''}`);
      return res.data;
    },
  });

  const { data: dollarRates, isLoading: dollarLoading, isError: dollarError } = useDollarRates();
  const { data: grainPrices, isLoading: grainsLoading, isError: grainsError } = useGrainPrices();
  const { data: weather, isLoading: weatherLoading, isError: weatherError } = useWeather();

  const { data: timeSeries, isLoading: tsLoading } = useQuery<TimeSeriesEntry[]>({
    queryKey: ['dashboard-timeseries', user?.id],
    queryFn: async () => {
      const res = await api.get(`/dashboard/time-series${qStr ? `?${qStr}&months=6` : '?months=6'}`);
      return res.data;
    },
  });

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Buenos días' : today.getHours() < 18 ? 'Buenas tardes' : 'Buenas noches';
  const todayLabel = format(today, "EEEE d 'de' MMMM", { locale: es });

  const tripsThisMonth = stats?.trips.thisMonth ?? 0;
  const tripsLastMonth = stats?.trips.lastMonth ?? 0;
  const tripTrend = tripsLastMonth > 0
    ? ((tripsThisMonth - tripsLastMonth) / tripsLastMonth) * 100
    : 0;

  const chartData = (timeSeries ?? []).map((entry) => ({
    ...entry,
    monthLabel: formatMonth(entry.month),
  }));

  function formatDollar(n: number) {
    return `$${new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)}`;
  }

  function formatGrainPrice(n: number) {
    return `$${new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)}/t`;
  }

  function minutesAgo(dateStr: string) {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return 'ahora';
    if (mins === 1) return 'hace 1 min';
    return `hace ${mins} min`;
  }

  function normalizeGrainName(nombre: string) {
    const lower = nombre.toLowerCase();
    if (lower.includes('soja')) return 'Soja';
    if (lower.includes('ma')) return 'Maíz';
    if (lower.includes('trigo')) return 'Trigo';
    return nombre;
  }

  if (statsError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <p className="text-gray-600">Error al cargar el dashboard.</p>
        <button
          onClick={() => refetchStats()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}{user?.firstName ? `, ${user.firstName}` : ''}
          </h1>
          <p className="text-gray-500 text-sm mt-1 capitalize">{todayLabel}</p>
        </div>
        <div className="relative" ref={exportRef}>
          <button onClick={() => setExportOpen((o) => !o)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <FileDown className="h-4 w-4" />
            Exportar
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>
          {exportOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
              <button onClick={handleExportExcel} className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Excel (.xlsx)</button>
              <button onClick={handleExportPDF} className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100">PDF</button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Row 1 — 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title={t('activeTrips')}
          value={stats?.trips.active ?? 0}
          icon={<Navigation className="h-5 w-5 text-blue-600" />}
          subtitle="En curso ahora"
          loading={statsLoading}
          variant="default"
        />
        <KpiCard
          title={t('tripsThisMonth')}
          value={tripsThisMonth}
          icon={<Navigation className="h-5 w-5 text-indigo-600" />}
          trend={tripsLastMonth > 0 ? { value: tripTrend, label: 'vs mes anterior' } : undefined}
          subtitle={`${tripsLastMonth} el mes pasado`}
          loading={statsLoading}
        />
        <KpiCard
          title={t('pendingRevenue')}
          value={statsLoading ? '—' : formatCurrency(stats?.billing.pendingRevenue ?? 0)}
          icon={<DollarSign className="h-5 w-5 text-amber-600" />}
          subtitle="Viajes sin cobrar"
          loading={statsLoading}
          variant={stats && stats.billing.pendingRevenue > 0 ? 'warning' : 'default'}
        />
        <KpiCard
          title={t('fleetUtilization')}
          value={`${stats?.fleet.utilization ?? 0}%`}
          icon={<Truck className="h-5 w-5 text-green-600" />}
          subtitle={`${stats?.fleet.onTrip ?? 0} de ${stats?.fleet.active ?? 0} vehículos`}
          progress={stats?.fleet.utilization ?? 0}
          loading={statsLoading}
        />
      </div>

      {/* KPI Row 2 — 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title={t('totalWeight')}
          value={statsLoading ? '—' : `${stats?.logistics.totalWeightTons ?? 0} t`}
          icon={<Package className="h-5 w-5 text-gray-600" />}
          subtitle="Histórico total"
          loading={statsLoading}
        />
        <KpiCard
          title={t('unreadAlerts')}
          value={stats?.logistics.alertsUnread ?? 0}
          icon={<Bell className="h-5 w-5 text-red-500" />}
          subtitle="Requieren atención"
          loading={statsLoading}
          variant={stats && stats.logistics.alertsUnread > 0 ? 'danger' : 'default'}
        />
        <KpiCard
          title={t('avgDelivery')}
          value={statsLoading ? '—' : `${stats?.logistics.avgDeliveryHours ?? 0} h`}
          icon={<Clock className="h-5 w-5 text-purple-600" />}
          subtitle="Viajes finalizados"
          loading={statsLoading}
        />
      </div>

      {/* Mercado */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Mercado</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Widget 1 — Dólar */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-800">💵 Dólar</span>
              {dollarRates?.oficial?.fechaActualizacion && (
                <span className="text-xs text-gray-400">{minutesAgo(dollarRates.oficial.fechaActualizacion)}</span>
              )}
            </div>
            {dollarLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-5 animate-pulse bg-gray-100 rounded" />)}
              </div>
            ) : dollarError || !dollarRates ? (
              <p className="text-sm text-gray-400">No disponible</p>
            ) : (
              <div className="space-y-2">
                {[
                  { label: 'Oficial', data: dollarRates.oficial },
                  { label: 'Blue', data: dollarRates.blue },
                  { label: 'MEP', data: dollarRates.mep },
                ].map(({ label, data }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-800">
                      {data ? formatDollar(data.venta) : <span className="text-gray-400">—</span>}
                    </span>
                  </div>
                ))}
                <p className="text-[11px] text-gray-400 pt-1 border-t border-gray-100">
                  Fuente:{' '}
                  <a
                    href="https://dolarapi.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    DolarApi.com
                  </a>
                </p>
              </div>
            )}
          </div>

          {/* Widget 2 — Granos */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-800">🌾 Granos</span>
            </div>
            {grainsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-5 animate-pulse bg-gray-100 rounded" />)}
              </div>
            ) : grainsError || !grainPrices?.length ? (
              <p className="text-sm text-gray-400">No disponible</p>
            ) : (
              <div className="space-y-2">
                {grainPrices.map((grain) => (
                  <div key={grain.nombre} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{normalizeGrainName(grain.nombre)}</span>
                    <span className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-800">{formatGrainPrice(grain.precio)}</span>
                      {grain.variacion !== 0 && (
                        <span className={grain.variacion > 0 ? 'text-green-600 text-xs' : 'text-red-500 text-xs'}>
                          {grain.variacion > 0 ? '▲' : '▼'} {Math.abs(grain.variacion).toFixed(1)}%
                        </span>
                      )}
                    </span>
                  </div>
                ))}
                <p className="text-[11px] text-gray-400 pt-1 border-t border-gray-100">
                  Fuente: Pizarra{' '}
                  <a
                    href="https://www.cac.bcr.com.ar/es/precios-de-pizarra"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Cámara Arbitral de Cereales — BCR
                  </a>
                </p>
              </div>
            )}
          </div>

          {/* Widget 3 — Clima */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-800">🌤 Clima</span>
              <span className="text-xs text-gray-400">Buenos Aires</span>
            </div>
            {weatherLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-5 animate-pulse bg-gray-100 rounded" />)}
              </div>
            ) : weatherError || !weather ? (
              <p className="text-sm text-gray-400">No disponible</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Temperatura</span>
                  <span className="font-medium text-gray-800">{weather.temp}°C</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Condición</span>
                  <span className="font-medium text-gray-800">{weather.description}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Viento</span>
                  <span className="font-medium text-gray-800">{weather.windspeed} km/h</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Tendencia — últimos 6 meses</h2>
        {tsLoading ? (
          <div className="h-64 animate-pulse bg-gray-100 rounded-lg" />
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Sin datos disponibles</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'Facturación') return [formatCurrency(value), name];
                  return [value, name];
                }}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="trips" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} name="Viajes" />
              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Facturación" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom row: Recent trips + Expiring docs */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Trips */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">{t('recentTrips')}</h2>
            <Link href="/viajes" className="text-sm text-blue-600 hover:underline">{t('viewAll')}</Link>
          </div>
          {statsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse bg-gray-100 rounded" />
              ))}
            </div>
          ) : !stats?.recentTrips?.length ? (
            <p className="text-sm text-gray-400">No hay viajes recientes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 text-xs border-b">
                    <th className="pb-2 font-medium">Carga</th>
                    <th className="pb-2 font-medium">Origen</th>
                    <th className="pb-2 font-medium">Destino</th>
                    <th className="pb-2 font-medium">Estado</th>
                    <th className="pb-2 font-medium">Tarifa</th>
                    <th className="pb-2 font-medium">Chofer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.recentTrips.map((trip) => (
                    <tr key={trip.id} className="py-2">
                      <td className="py-2 pr-2 text-gray-700 truncate max-w-[100px]">{trip.cargo?.type ?? '—'}</td>
                      <td className="py-2 pr-2 text-gray-500 truncate max-w-[100px]">{trip.cargo?.originAddress?.split(',')[0] ?? '—'}</td>
                      <td className="py-2 pr-2 text-gray-500 truncate max-w-[100px]">{trip.cargo?.destinationAddress?.split(',')[0] ?? '—'}</td>
                      <td className="py-2 pr-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TRIP_STATUS_COLORS[trip.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {TRIP_STATUS_LABELS[trip.status] ?? trip.status}
                        </span>
                      </td>
                      <td className="py-2 pr-2 text-gray-700">{trip.agreedRate ? formatCurrency(trip.agreedRate) : '—'}</td>
                      <td className="py-2 text-gray-500 truncate max-w-[80px]">
                        {trip.driver?.user
                          ? `${trip.driver.user.firstName ?? ''} ${trip.driver.user.lastName ?? ''}`.trim() || '—'
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Expiring Documents */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">{t('expiringDocs')}</h2>
            <Link href="/documentos" className="text-sm text-blue-600 hover:underline">{t('viewAll')}</Link>
          </div>
          {statsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse bg-gray-100 rounded" />
              ))}
            </div>
          ) : !stats?.expiringDocuments?.length ? (
            <p className="text-sm text-gray-400">No hay documentos por vencer próximamente.</p>
          ) : (
            <div className="space-y-3">
              {stats.expiringDocuments.map((doc) => {
                const days = daysUntil(doc.expiresAt);
                const colorClass = days <= 7 ? 'text-red-600 font-semibold' : days <= 15 ? 'text-amber-600' : 'text-gray-500';
                return (
                  <div key={doc.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{doc.type}</p>
                      <p className="text-xs text-gray-400">{doc.entityType} · {doc.entityId.slice(0, 8)}…</p>
                    </div>
                    <span className={`text-sm ${colorClass}`}>
                      {days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `${days} días`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
