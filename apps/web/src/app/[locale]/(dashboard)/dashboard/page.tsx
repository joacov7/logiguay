'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import {
  Truck, Navigation, Package, Clock, DollarSign, AlertTriangle,
  CheckCircle, MapPin, TrendingUp, TrendingDown,
  Timer, Flag, Loader2, Wheat, BarChart3,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useTracking } from '@/hooks/useTracking';
import { useDollarRates, useGrainPrices } from '@/hooks/useMarketData';
import type { ActiveTrip } from '../tracking/MapView';

const MapView = dynamic(() => import('../tracking/MapView'), { ssr: false });

// ── Brand colors ──────────────────────────────────────────────────────────────
// Primary:  #2456E6 / #3B6BFF
// Success:  #15A66A
// Alert:    #F2870D
// Neutral:  gray/white

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardStats {
  trips: { active: number; onTrip?: number; finalized?: number; thisMonth?: number; lastMonth?: number; byStatus?: Record<string, number> };
  fleet: { total: number; active: number; onTrip: number; utilization?: number };
  billing: { thisMonth: number; totalRevenue?: number; pendingRevenue?: number };
  logistics: { alertsUnread: number; totalWeightTons?: number; avgDeliveryHours?: number };
}

interface Trip {
  id: string; status: string;
  vehicle?: { plate?: string };
  driver?: { user?: { firstName?: string; lastName?: string } };
  cargo?: { type?: string; originAddress?: string; destinationAddress?: string; weightTons?: number };
  estimatedArrival?: string;
}

interface AlertItem {
  id: string; title?: string; message?: string; type?: string; severity?: string; createdAt?: string; isRead?: boolean;
}

interface CargoItem {
  id: string; type?: string; originAddress?: string; destinationAddress?: string;
  weightTons?: number; estimatedValue?: number; status?: string;
}

interface TurnoSlot {
  id: string; scheduledAt: string; description?: string; status?: string;
  company?: { name?: string }; location?: string;
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
  return `hace ${Math.floor(mins / 60)} h`;
}

const STATUS_LABELS: Record<string, string> = {
  EN_TRANSITO: 'En ruta', EN_CARGA: 'Cargando', EN_CAMINO_ORIGEN: 'En camino',
  EN_DESCARGA: 'Descargando', ASIGNADO: 'Asignado',
};
const STATUS_COLORS: Record<string, string> = {
  EN_TRANSITO: 'text-[#3B6BFF]', EN_CARGA: 'text-[#F2870D]',
  EN_CAMINO_ORIGEN: 'text-cyan-600', EN_DESCARGA: 'text-[#F2870D]',
  ASIGNADO: 'text-[#2456E6]',
};
const STATUS_BG: Record<string, string> = {
  EN_TRANSITO: 'bg-blue-50 text-[#2456E6]', EN_CARGA: 'bg-orange-50 text-[#F2870D]',
  EN_CAMINO_ORIGEN: 'bg-cyan-50 text-cyan-700', EN_DESCARGA: 'bg-orange-50 text-[#F2870D]',
  ASIGNADO: 'bg-blue-50 text-[#2456E6]',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ icon, iconBg, title, value, subtitle, trend, loading }: {
  icon: React.ReactNode; iconBg: string; title: string;
  value: string | number; subtitle: string;
  trend?: { value: number; label: string }; loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-start gap-4">
      <div className={`${iconBg} rounded-xl p-3 flex-shrink-0`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{title}</p>
        {loading
          ? <div className="h-7 w-20 animate-pulse bg-gray-100 rounded mt-1" />
          : <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        }
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        {trend && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trend.value >= 0 ? 'text-[#15A66A]' : 'text-[#F2870D]'}`}>
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

  const today = new Date();
  const todayLabel = format(today, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  const timeLabel = format(today, 'HH:mm');

  const statsQStr = companyId ? `?companyId=${companyId}` : '';

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => { const res = await api.get(`/dashboard/stats${statsQStr}`); return res.data; },
  });

  const { data: tripsData, isLoading: tripsLoading } = useQuery<{ data: Trip[] }>({
    queryKey: ['active-trips-dashboard'],
    queryFn: async () => { const res = await api.get('/trips?status=EN_TRANSITO,EN_CARGA,EN_CAMINO_ORIGEN,EN_DESCARGA&limit=10'); return res.data; },
    refetchInterval: 30_000,
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery<{ data: AlertItem[] }>({
    queryKey: ['alerts-dashboard', companyId],
    queryFn: async () => { const res = await api.get(`/alerts${companyId ? `?companyId=${companyId}&limit=5` : '?limit=5'}`); return res.data; },
  });

  const { data: cargasData } = useQuery<{ data: CargoItem[] }>({
    queryKey: ['cargas-dashboard'],
    queryFn: async () => { const res = await api.get('/cargo?status=PUBLICADO&limit=4'); return res.data; },
    refetchInterval: 60_000,
  });

  const { data: turnosData } = useQuery<{ data: TurnoSlot[] }>({
    queryKey: ['turnos-dashboard', companyId],
    queryFn: async () => {
      const dateStr = format(today, 'yyyy-MM-dd');
      const res = await api.get(`/turnos/slots?date=${dateStr}&limit=4${companyId ? `&companyId=${companyId}` : ''}`);
      return res.data;
    },
  });

  const { data: dollarRates } = useDollarRates();
  const { data: grainPrices } = useGrainPrices();

  const activeTrips = tripsData?.data ?? [];
  const alerts = alertsData?.data ?? [];
  const cargas = cargasData?.data ?? [];
  const turnos = turnosData?.data ?? [];

  const mapActiveTrips: ActiveTrip[] = activeTrips.map((t) => ({
    id: t.id, plate: t.vehicle?.plate, status: t.status, type: t.cargo?.type,
    originAddress: t.cargo?.originAddress, destinationAddress: t.cargo?.destinationAddress,
  }));

  const fleetTotal = stats?.fleet.total ?? 0;
  const fleetOnTrip = stats?.fleet.onTrip ?? 0;
  const fleetActive = (stats?.fleet.active ?? 0) - fleetOnTrip;
  const fleetMaint = Math.max(0, fleetTotal - (stats?.fleet.active ?? 0));
  const fleetLoading = Math.max(0, stats?.trips.byStatus?.EN_CARGA ?? 0);

  const donutData = [
    { name: 'En ruta', value: fleetOnTrip, color: '#2456E6' },
    { name: 'Disponibles', value: Math.max(0, fleetActive - fleetLoading), color: '#15A66A' },
    { name: 'En carga', value: fleetLoading, color: '#F2870D' },
    { name: 'En mantenimiento', value: fleetMaint, color: '#9ca3af' },
  ].filter((d) => d.value > 0);

  const tripsThisMonth = stats?.trips.thisMonth ?? 0;
  const tripsLastMonth = stats?.trips.lastMonth ?? 1;
  const tripTrend = tripsLastMonth > 0 ? ((tripsThisMonth - tripsLastMonth) / tripsLastMonth) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Market ticker bar ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-2 flex items-center gap-6 overflow-x-auto text-xs">
        <span className="flex items-center gap-1.5 font-semibold flex-shrink-0" style={{ color: '#2456E6' }}>
          <BarChart3 className="h-3.5 w-3.5" /> Mercado
        </span>

        {/* Dollar rates */}
        {dollarRates?.oficial && (
          <span className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-gray-400">Oficial</span>
            <span className="font-semibold text-gray-800">${dollarRates.oficial.venta.toLocaleString('es-AR')}</span>
          </span>
        )}
        {dollarRates?.blue && (
          <span className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-gray-400">Blue</span>
            <span className="font-bold" style={{ color: '#3B6BFF' }}>${dollarRates.blue.venta.toLocaleString('es-AR')}</span>
          </span>
        )}
        {dollarRates?.mep && (
          <span className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-gray-400">MEP</span>
            <span className="font-semibold text-gray-800">${dollarRates.mep.venta.toLocaleString('es-AR')}</span>
          </span>
        )}

        {/* Grain prices from Bolsa de Rosario */}
        {grainPrices && grainPrices.length > 0 && (
          <>
            <span className="text-gray-200 flex-shrink-0 select-none">|</span>
            <span className="flex items-center gap-1 flex-shrink-0 font-semibold" style={{ color: '#15A66A' }}>
              <Wheat className="h-3.5 w-3.5" /> Rosario
            </span>
            {grainPrices.slice(0, 5).map((g) => (
              <span key={g.nombre} className="flex items-center gap-1 flex-shrink-0">
                <span className="text-gray-500">{g.nombre}</span>
                <span className="font-semibold text-gray-800">${g.precio.toLocaleString('es-AR')}</span>
                {g.variacion !== 0 && (
                  <span className="font-medium" style={{ color: g.variacion > 0 ? '#15A66A' : '#F2870D' }}>
                    {g.variacion > 0 ? '▲' : '▼'}{Math.abs(g.variacion).toFixed(1)}%
                  </span>
                )}
              </span>
            ))}
          </>
        )}
      </div>

      <div className="max-w-[1600px] mx-auto p-6 space-y-6">

        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centro de Operaciones</h1>
          <p className="text-gray-500 text-sm mt-1 capitalize">{todayLabel} · {timeLabel} hs</p>
        </div>

        {/* ── 5 KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <KpiCard
            icon={<Truck className="h-5 w-5" style={{ color: '#2456E6' }} />}
            iconBg="bg-blue-50"
            title="Camiones en ruta" value={stats?.fleet.onTrip ?? 0} subtitle="Activos ahora" loading={statsLoading} />
          <KpiCard
            icon={<Navigation className="h-5 w-5" style={{ color: '#15A66A' }} />}
            iconBg="bg-emerald-50"
            title="Viajes activos" value={stats?.trips.active ?? 0} subtitle="En progreso"
            loading={statsLoading} trend={{ value: tripTrend, label: 'vs mes ant.' }} />
          <KpiCard
            icon={<Package className="h-5 w-5" style={{ color: '#3B6BFF' }} />}
            iconBg="bg-blue-50"
            title="Peso en tránsito" value={`${(stats?.logistics.totalWeightTons ?? 0).toLocaleString('es-AR')} t`}
            subtitle="Carga en movimiento" loading={statsLoading} />
          <KpiCard
            icon={<Clock className="h-5 w-5" style={{ color: '#F2870D' }} />}
            iconBg="bg-orange-50"
            title="Turnos hoy" value={turnos.length || (stats?.trips.active ?? 0)} subtitle="Programados hoy" />
          <KpiCard
            icon={<DollarSign className="h-5 w-5" style={{ color: '#15A66A' }} />}
            iconBg="bg-emerald-50"
            title="Facturación mes" value={formatCurrency(stats?.billing.thisMonth ?? 0)}
            subtitle="Este mes" loading={statsLoading} />
        </div>

        {/* ── Map + Active Trips ── */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          <div className="xl:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-800">Seguimiento en tiempo real</span>
                <span className="text-gray-300">·</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: connected ? '#15A66A' : '#9ca3af' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: connected ? '#15A66A' : '#9ca3af', animation: connected ? 'pulse 2s infinite' : 'none' }} />
                  {connected ? 'En vivo' : 'Desconectado'}
                </span>
              </div>
              <span className="text-xs text-gray-400">{positions.length} vehículos con GPS</span>
            </div>
            <div style={{ height: 360 }}>
              <MapView positions={positions} activeTrips={mapActiveTrips} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Viajes activos</h3>
              <p className="text-xs text-gray-400">{activeTrips.length} en curso</p>
            </div>
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: 360 }}>
              {tripsLoading ? (
                <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse bg-gray-100 rounded-lg" />)}</div>
              ) : activeTrips.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm py-10">
                  <Truck className="h-8 w-8 mb-2 opacity-40" />Sin viajes activos
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
                            {trip.driver?.user ? `${trip.driver.user.firstName ?? ''} ${trip.driver.user.lastName ?? ''}`.trim() : 'Sin chofer'}
                          </p>
                        </div>
                        <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BG[trip.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[trip.status] ?? trip.status}
                        </span>
                      </div>
                      {trip.estimatedArrival && (
                        <p className="text-xs font-medium mt-1" style={{ color: '#15A66A' }}>
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
              <span className="text-xs text-gray-400">{cargas.length} publicadas</span>
            </div>
            {cargas.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />Sin cargas publicadas
              </div>
            ) : (
              <div className="space-y-3">
                {cargas.map((carga) => (
                  <div key={carga.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm font-semibold text-gray-800">{carga.type ?? 'General'}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#dcfce7', color: '#15A66A' }}>Disponible</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 ml-5 truncate max-w-[160px]">
                        {carga.originAddress?.split(',')[0] ?? '—'} → {carga.destinationAddress?.split(',')[0] ?? '—'}
                      </p>
                      {carga.weightTons && <p className="text-xs text-gray-500 mt-0.5 ml-5">{carga.weightTons} tn</p>}
                    </div>
                    {carga.estimatedValue && (
                      <p className="text-sm font-bold text-gray-900 flex-shrink-0">{formatCurrency(carga.estimatedValue)}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Col 2: Próximos turnos + Alertas */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">Próximos turnos</h3>
              <span className="text-xs text-gray-400">Hoy</span>
            </div>
            {turnos.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />Sin turnos para hoy
              </div>
            ) : (
              <div className="space-y-3">
                {turnos.map((turno) => (
                  <div key={turno.id} className="flex items-start gap-3">
                    <div className="text-center w-12 flex-shrink-0">
                      <span className="text-sm font-bold text-gray-800">
                        {format(new Date(turno.scheduledAt), 'HH:mm')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 border-l border-gray-200 pl-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-800 truncate">{turno.description ?? turno.company?.name ?? 'Turno'}</p>
                        <span
                          className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
                          style={turno.status === 'CONFIRMADO' || turno.status === 'BOOKED'
                            ? { background: '#dcfce7', color: '#15A66A' }
                            : { background: '#fff7ed', color: '#F2870D' }}
                        >
                          {turno.status === 'CONFIRMADO' || turno.status === 'BOOKED' ? 'Confirmado' : 'Pendiente'}
                        </span>
                      </div>
                      {turno.location && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{turno.location}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                Alertas
                {alerts.filter(a => !a.isRead).length > 0 && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#fff7ed', color: '#F2870D' }}>
                    {alerts.filter(a => !a.isRead).length}
                  </span>
                )}
              </h3>
              {alertsLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 animate-pulse bg-gray-100 rounded" />)}</div>
              ) : alerts.length === 0 ? (
                <div className="flex items-center gap-2 text-xs" style={{ color: '#15A66A' }}>
                  <CheckCircle className="h-4 w-4" /> Sin alertas pendientes
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <div key={alert.id} className={`flex items-start gap-2 p-2 rounded-lg ${alert.isRead ? 'bg-gray-50' : 'bg-orange-50'}`}>
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: alert.severity === 'error' ? '#ef4444' : '#F2870D' }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-800 truncate">{alert.title ?? alert.type ?? 'Alerta'}</p>
                        <p className="text-xs text-gray-400 truncate">{alert.message}</p>
                      </div>
                      <span className="text-xs text-gray-300 flex-shrink-0">{timeAgo(alert.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Col 3: Fleet donut */}
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
                      cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                      dataKey="value" strokeWidth={2} stroke="#fff"
                    >
                      {(donutData.length > 0 ? donutData : [{ name: 'Sin datos', value: 1, color: '#e5e7eb' }]).map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value} vehículos`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-gray-900">{fleetTotal}</span>
                  <span className="text-xs text-gray-400">Total</span>
                </div>
              </div>
            )}
            <div className="mt-2 space-y-2">
              {[
                { name: 'En ruta', value: fleetOnTrip, color: '#2456E6' },
                { name: 'Disponibles', value: Math.max(0, (stats?.fleet.active ?? 0) - fleetOnTrip - fleetLoading), color: '#15A66A' },
                { name: 'En carga', value: fleetLoading, color: '#F2870D' },
                { name: 'En mantenimiento', value: fleetMaint, color: '#9ca3af' },
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
                <div className="rounded-lg p-2.5" style={{ background: 'rgba(36,86,230,0.2)' }}>
                  <Navigation className="h-5 w-5" style={{ color: '#3B6BFF' }} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Viajes activos</p>
                  <p className="text-lg font-bold text-white">{stats?.trips.active ?? 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2.5" style={{ background: 'rgba(21,166,106,0.2)' }}>
                  <Truck className="h-5 w-5" style={{ color: '#15A66A' }} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Flota utilizada</p>
                  <p className="text-lg font-bold text-white">{stats?.fleet.utilization ?? 0}%</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2.5" style={{ background: 'rgba(59,107,255,0.2)' }}>
                  <Timer className="h-5 w-5" style={{ color: '#3B6BFF' }} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Entrega promedio</p>
                  <p className="text-lg font-bold text-white">{stats?.logistics.avgDeliveryHours ?? 0} h</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2.5" style={{ background: 'rgba(242,135,13,0.2)' }}>
                  <Flag className="h-5 w-5" style={{ color: '#F2870D' }} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Viajes finalizados</p>
                  <p className="text-lg font-bold text-white">{stats?.trips.finalized ?? 0}</p>
                </div>
              </div>
            </div>
            <button
              className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg"
              style={{ background: '#2456E6' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#3B6BFF')}
              onMouseLeave={e => (e.currentTarget.style.background = '#2456E6')}
            >
              <Loader2 className="h-4 w-4" /> Generar reporte diario
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
