'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import {
  Truck,
  Navigation,
  Package,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Settings,
  TrendingUp,
  TrendingDown,
  Fuel,
  Timer,
  Route,
  Flag,
  Loader2,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useTracking } from '@/hooks/useTracking';
import type { ActiveTrip } from '../tracking/MapView';

const MapView = dynamic(() => import('../tracking/MapView'), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardStats {
  trips: {
    active: number;
    onTrip?: number;
    finalized?: number;
    thisMonth?: number;
    lastMonth?: number;
    byStatus?: Record<string, number>;
  };
  fleet: {
    total: number;
    active: number;
    onTrip: number;
    utilization?: number;
  };
  billing: {
    thisMonth: number;
    totalRevenue?: number;
    pendingRevenue?: number;
  };
  logistics: {
    alertsUnread: number;
    totalWeightTons?: number;
    avgDeliveryHours?: number;
  };
}

interface Trip {
  id: string;
  status: string;
  vehicle?: { plate?: string };
  driver?: { user?: { firstName?: string; lastName?: string } };
  cargo?: {
    type?: string;
    originAddress?: string;
    destinationAddress?: string;
    weightTons?: number;
  };
  estimatedArrival?: string;
  agreedRate?: number;
}

interface Alert {
  id: string;
  title?: string;
  message?: string;
  type?: string;
  severity?: string;
  createdAt?: string;
  read?: boolean;
}

interface Turno {
  id: string;
  time: string;
  title: string;
  location: string;
  status: 'Confirmado' | 'Pendiente';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return '';
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `hace ${hrs} h`;
}

const STATUS_LABELS: Record<string, string> = {
  EN_TRANSITO: 'En ruta',
  EN_CARGA: 'Cargando',
  EN_CAMINO_ORIGEN: 'En camino',
  EN_DESCARGA: 'Descargando',
  ASIGNADO: 'Asignado',
};

const STATUS_COLORS: Record<string, string> = {
  EN_TRANSITO: 'bg-blue-100 text-blue-700',
  EN_CARGA: 'bg-yellow-100 text-yellow-700',
  EN_CAMINO_ORIGEN: 'bg-cyan-100 text-cyan-700',
  EN_DESCARGA: 'bg-orange-100 text-orange-700',
  ASIGNADO: 'bg-indigo-100 text-indigo-700',
};

const ALERT_ICONS: Record<string, React.ReactNode> = {
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  error: <AlertTriangle className="h-4 w-4 text-red-500" />,
  info: <CheckCircle className="h-4 w-4 text-blue-500" />,
};

// Mock turnos data (API may not exist)
const MOCK_TURNOS: Turno[] = [
  { id: '1', time: '08:00', title: 'Carga Soja — Rosario', location: 'Terminal Puerto', status: 'Confirmado' },
  { id: '2', time: '08:30', title: 'Descarga Maíz — Córdoba', location: 'Acopio Central', status: 'Confirmado' },
  { id: '3', time: '09:00', title: 'Carga Trigo — Santa Fe', location: 'Elevador N°3', status: 'Pendiente' },
  { id: '4', time: '09:30', title: 'Descarga Sorgo — Bahía', location: 'Puerto Comercial', status: 'Pendiente' },
];

// Mock cargas disponibles
const MOCK_CARGAS = [
  { id: '1', tipo: 'Soja', origen: 'Rosario', destino: 'Buenos Aires', peso: 28, precio: 4200 },
  { id: '2', tipo: 'Maíz', origen: 'Córdoba', destino: 'Rosario', peso: 30, precio: 3800 },
  { id: '3', tipo: 'Sorgo', origen: 'Santa Fe', destino: 'Bahía Blanca', peso: 25, precio: 3500 },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  iconBg,
  title,
  value,
  subtitle,
  trend,
  loading,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  value: string | number;
  subtitle: string;
  trend?: { value: number; label: string };
  loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-start gap-4">
      <div className={`${iconBg} rounded-xl p-3 flex-shrink-0`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{title}</p>
        {loading ? (
          <div className="h-7 w-20 animate-pulse bg-gray-100 rounded mt-1" />
        ) : (
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        {trend && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trend.value >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend.value).toFixed(1)}% {trend.label}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const companyId = (user as { companyId?: string } | null)?.companyId;
  const { positions: positionsMap, connected } = useTracking();
  const positions = Object.values(positionsMap);
  const [_now] = useState(new Date());

  const today = new Date();
  const todayLabel = format(today, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  const timeLabel = format(today, 'HH:mm');

  // ── API queries ──
  const statsQStr = companyId ? `?companyId=${companyId}` : '';

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      const res = await api.get(`/dashboard/stats${statsQStr}`);
      return res.data;
    },
  });

  const { data: tripsData, isLoading: tripsLoading } = useQuery<{ data: Trip[] }>({
    queryKey: ['active-trips-dashboard'],
    queryFn: async () => {
      const res = await api.get('/trips?status=EN_TRANSITO,EN_CARGA,EN_CAMINO_ORIGEN,EN_DESCARGA&limit=10');
      return res.data;
    },
    refetchInterval: 30_000,
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery<{ data: Alert[] }>({
    queryKey: ['alerts-dashboard', companyId],
    queryFn: async () => {
      const res = await api.get(`/alerts${companyId ? `?companyId=${companyId}&limit=5` : '?limit=5'}`);
      return res.data;
    },
  });

  const activeTrips = tripsData?.data ?? [];
  const alerts = alertsData?.data ?? [];

  // Build ActiveTrip[] for map
  const mapActiveTrips: ActiveTrip[] = activeTrips.map((t) => ({
    id: t.id,
    plate: t.vehicle?.plate,
    status: t.status,
    type: t.cargo?.type,
    originAddress: t.cargo?.originAddress,
    destinationAddress: t.cargo?.destinationAddress,
  }));

  // Fleet donut data
  const fleetTotal = stats?.fleet.total ?? 0;
  const fleetOnTrip = stats?.fleet.onTrip ?? 0;
  const fleetActive = (stats?.fleet.active ?? 0) - fleetOnTrip;
  const fleetMaint = fleetTotal - (stats?.fleet.active ?? 0);
  const fleetLoading = Math.max(0, (stats?.trips.byStatus?.EN_CARGA ?? 0));

  const donutData = [
    { name: 'En ruta', value: fleetOnTrip, color: '#2563eb' },
    { name: 'Disponibles', value: Math.max(0, fleetActive - fleetLoading), color: '#16a34a' },
    { name: 'En carga', value: fleetLoading, color: '#ca8a04' },
    { name: 'En mantenimiento', value: Math.max(0, fleetMaint), color: '#f97316' },
  ].filter((d) => d.value > 0);

  // KPI values
  const tripsActive = stats?.trips.active ?? 0;
  const tripsOnTrip = stats?.trips.onTrip ?? fleetOnTrip;
  const weightTons = stats?.logistics.totalWeightTons ?? 0;
  const billingMonth = stats?.billing.thisMonth ?? 0;
  const shiftsToday = MOCK_TURNOS.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Centro de Operaciones</h1>
            <p className="text-gray-500 text-sm mt-1 capitalize">{todayLabel} · {timeLabel} hs</p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm transition-colors">
            <Settings className="h-4 w-4" />
            Personalizar
          </button>
        </div>

        {/* ── 5 KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <KpiCard
            icon={<Truck className="h-5 w-5 text-blue-600" />}
            iconBg="bg-blue-50"
            title="Camiones en ruta"
            value={tripsOnTrip}
            subtitle="Activos ahora"
            loading={statsLoading}
            trend={{ value: 12, label: 'vs ayer' }}
          />
          <KpiCard
            icon={<Navigation className="h-5 w-5 text-green-600" />}
            iconBg="bg-green-50"
            title="Viajes activos"
            value={tripsActive}
            subtitle="En progreso"
            loading={statsLoading}
          />
          <KpiCard
            icon={<Package className="h-5 w-5 text-purple-600" />}
            iconBg="bg-purple-50"
            title="En tránsito (tons)"
            value={statsLoading ? 0 : `${weightTons.toLocaleString('es-AR')} t`}
            subtitle="Carga en movimiento"
            loading={statsLoading}
          />
          <KpiCard
            icon={<Clock className="h-5 w-5 text-orange-600" />}
            iconBg="bg-orange-50"
            title="Turnos hoy"
            value={shiftsToday}
            subtitle="Programados"
          />
          <KpiCard
            icon={<DollarSign className="h-5 w-5 text-teal-600" />}
            iconBg="bg-teal-50"
            title="Facturación mes"
            value={statsLoading ? 0 : formatCurrency(billingMonth)}
            subtitle="Este mes"
            loading={statsLoading}
            trend={{ value: 8.3, label: 'vs mes ant.' }}
          />
        </div>

        {/* ── Map + Active Trips ── */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Map — 3/4 */}
          <div className="xl:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-800">Seguimiento en tiempo real</span>
                <span className="text-gray-300">·</span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-medium ${connected ? 'text-green-600' : 'text-gray-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                  {connected ? 'En vivo' : 'Desconectado'}
                </span>
              </div>
              <span className="text-xs text-gray-400">{positions.length} vehículos visibles</span>
            </div>
            <div style={{ height: 360 }}>
              <MapView positions={positions} activeTrips={mapActiveTrips} />
            </div>
          </div>

          {/* Active Trips list — 1/4 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Viajes activos</h3>
              <p className="text-xs text-gray-400">{activeTrips.length} en curso</p>
            </div>
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: 360 }}>
              {tripsLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 animate-pulse bg-gray-100 rounded-lg" />
                  ))}
                </div>
              ) : activeTrips.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm py-10">
                  <Truck className="h-8 w-8 mb-2 opacity-40" />
                  Sin viajes activos
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {activeTrips.map((trip) => (
                    <div key={trip.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">
                            {trip.cargo?.originAddress?.split(',')[0] ?? '—'} → {trip.cargo?.destinationAddress?.split(',')[0] ?? '—'}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{trip.vehicle?.plate ?? 'Sin patente'}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {trip.driver?.user
                              ? `${trip.driver.user.firstName ?? ''} ${trip.driver.user.lastName ?? ''}`.trim()
                              : 'Sin chofer'}
                          </p>
                        </div>
                        <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[trip.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[trip.status] ?? trip.status}
                        </span>
                      </div>
                      {trip.estimatedArrival && (
                        <p className="text-xs text-green-600 font-medium mt-1">
                          ETA: {format(new Date(trip.estimatedArrival), 'HH:mm', { locale: es })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Three-column section ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Col 1: Cargas disponibles */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">Cargas disponibles</h3>
              <span className="text-xs text-gray-400">{MOCK_CARGAS.length} disponibles</span>
            </div>
            <div className="space-y-3">
              {MOCK_CARGAS.map((carga) => (
                <div key={carga.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-800">{carga.tipo}</span>
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Disponible</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 ml-5">
                      {carga.origen} → {carga.destino}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 ml-5">{carga.peso} tn</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">${carga.precio.toLocaleString('es-AR')}</p>
                    <p className="text-xs text-gray-400">/ton</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Col 2: Próximos turnos */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">Próximos turnos</h3>
              <span className="text-xs text-gray-400">Hoy</span>
            </div>
            <div className="space-y-3">
              {MOCK_TURNOS.map((turno) => (
                <div key={turno.id} className="flex items-start gap-3">
                  <div className="text-center w-12 flex-shrink-0">
                    <span className="text-sm font-bold text-gray-800">{turno.time}</span>
                  </div>
                  <div className="flex-1 min-w-0 border-l border-gray-200 pl-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-800 truncate">{turno.title}</p>
                      <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${turno.status === 'Confirmado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {turno.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{turno.location}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Alerts below turnos */}
            <div className="mt-5 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Alertas</h3>
              {alertsLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-10 animate-pulse bg-gray-100 rounded" />)}
                </div>
              ) : alerts.length === 0 ? (
                <p className="text-xs text-gray-400">Sin alertas pendientes</p>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <div key={alert.id} className={`flex items-start gap-2 p-2 rounded-lg ${alert.read ? 'bg-gray-50' : 'bg-amber-50'}`}>
                      {ALERT_ICONS[alert.severity ?? alert.type ?? 'info'] ?? <AlertTriangle className="h-4 w-4 text-gray-400" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-800 truncate">{alert.title ?? 'Alerta'}</p>
                        <p className="text-xs text-gray-400 truncate">{alert.message}</p>
                      </div>
                      <span className="text-xs text-gray-300 flex-shrink-0">{timeAgo(alert.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Col 3: Estado de la flota (donut) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">Estado de la flota</h3>
              <span className="text-xs text-gray-400">{fleetTotal} vehículos</span>
            </div>

            {statsLoading ? (
              <div className="h-48 animate-pulse bg-gray-100 rounded-lg" />
            ) : (
              <div className="relative">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={donutData.length > 0 ? donutData : [{ name: 'Sin datos', value: 1, color: '#e5e7eb' }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="#fff"
                    >
                      {(donutData.length > 0 ? donutData : [{ name: 'Sin datos', value: 1, color: '#e5e7eb' }]).map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [`${value} vehículos`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-gray-900">{fleetTotal}</span>
                  <span className="text-xs text-gray-400">Total</span>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="mt-2 space-y-2">
              {[
                { name: 'En ruta', value: fleetOnTrip, color: '#2563eb' },
                { name: 'Disponibles', value: Math.max(0, (stats?.fleet.active ?? 0) - fleetOnTrip - fleetLoading), color: '#16a34a' },
                { name: 'En carga', value: fleetLoading, color: '#ca8a04' },
                { name: 'En mantenimiento', value: Math.max(0, fleetTotal - (stats?.fleet.active ?? 0)), color: '#f97316' },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <span className="text-xs text-gray-600">{item.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Dark stats bar ── */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#0A1633' }}>
          <div className="px-6 py-5 flex flex-col md:flex-row md:items-center gap-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 rounded-lg p-2.5">
                  <Route className="h-5 w-5 text-blue-300" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Distancia recorrida hoy</p>
                  <p className="text-lg font-bold text-white">2,847 km</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white/10 rounded-lg p-2.5">
                  <Fuel className="h-5 w-5 text-green-300" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Combustible consumido</p>
                  <p className="text-lg font-bold text-white">1,240 L</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white/10 rounded-lg p-2.5">
                  <Timer className="h-5 w-5 text-purple-300" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Tiempo en movimiento</p>
                  <p className="text-lg font-bold text-white">38 h 20 m</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white/10 rounded-lg p-2.5">
                  <Flag className="h-5 w-5 text-orange-300" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Viajes finalizados hoy</p>
                  <p className="text-lg font-bold text-white">{stats?.trips.finalized ?? 0}</p>
                </div>
              </div>
            </div>
            <button className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg">
              <Loader2 className="h-4 w-4" />
              Generar reporte diario
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
