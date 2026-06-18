'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag,
  MapPin,
  Weight,
  Calendar,
  Search,
  ChevronDown,
  ChevronUp,
  Navigation,
  X,
  Building2,
  Info,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Cargo, PaginatedResponse } from '@/types';
import { formatAddressShort } from '@/lib/formatAddress';

interface Filters {
  search: string;
  type: string;
  minWeight: string;
  maxWeight: string;
  minValue: string;
  maxValue: string;
  requiredDateFrom: string;
  requiredDateTo: string;
  orderBy: string;
  orderDir: string;
}

interface GeoState {
  lat: string;
  lng: string;
  radiusKm: string;
  province: string;
}

const CARGO_TYPES = ['Cereal', 'Fertilizante', 'Maquinaria', 'General', 'Otro', 'Granos', 'Combustible', 'Materiales', 'Refrigerados'];

const RADIUS_OPTIONS = [
  { label: '50 km', value: '50' },
  { label: '100 km', value: '100' },
  { label: '200 km', value: '200' },
  { label: '500 km', value: '500' },
  { label: 'Todos', value: '' },
];

const ARGENTINA_PROVINCES = [
  'Buenos Aires',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
];

const QUOTE_STATUS_LABEL: Record<string, { label: string; className: string }> = {
  PENDIENTE: { label: 'En revisión', className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  ACEPTADA: { label: '¡Aceptada!', className: 'bg-green-50 text-green-700 border border-green-200' },
  RECHAZADA: { label: 'Rechazada', className: 'bg-red-50 text-red-700 border border-red-200' },
};

export default function BolsaPage() {
  const { user } = useAuth();
  const companyId = (user as any)?.companyId as string | undefined;
  const isTransportista = user?.role === 'TRANSPORTISTA';
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'bolsa' | 'mis-cotizaciones'>('bolsa');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailCargoId, setDetailCargoId] = useState<string | null>(null);
  const [quotingCargoId, setQuotingCargoId] = useState<string | null>(null);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [filters, setFilters] = useState<Filters>({
    search: '',
    type: '',
    minWeight: '',
    maxWeight: '',
    minValue: '',
    maxValue: '',
    requiredDateFrom: '',
    requiredDateTo: '',
    orderBy: 'createdAt',
    orderDir: 'desc',
  });
  const [geo, setGeo] = useState<GeoState>({
    lat: '',
    lng: '',
    radiusKm: '',
    province: '',
  });

  const queryClient = useQueryClient();

  const geoActive = geo.lat !== '' && geo.lng !== '';

  const buildParams = () => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '12');
    if (filters.search) params.set('search', filters.search);
    if (filters.type) params.set('type', filters.type);
    if (filters.minWeight) params.set('minWeight', filters.minWeight);
    if (filters.maxWeight) params.set('maxWeight', filters.maxWeight);
    if (filters.minValue) params.set('minValue', filters.minValue);
    if (filters.maxValue) params.set('maxValue', filters.maxValue);
    if (filters.requiredDateFrom) params.set('requiredDateFrom', filters.requiredDateFrom);
    if (filters.requiredDateTo) params.set('requiredDateTo', filters.requiredDateTo);
    if (!geoActive) {
      params.set('orderBy', filters.orderBy);
      params.set('orderDir', filters.orderDir);
    }
    if (geoActive) {
      params.set('lat', geo.lat);
      params.set('lng', geo.lng);
      if (geo.radiusKm) params.set('radiusKm', geo.radiusKm);
    }
    if (geo.province) params.set('province', geo.province);
    return params.toString();
  };

  const { data, isLoading } = useQuery<PaginatedResponse<Cargo>>({
    queryKey: ['bolsa', page, filters, geo],
    queryFn: async () => {
      const res = await api.get(`/cargo/marketplace?${buildParams()}`);
      return res.data;
    },
  });

  // Fetch own quotes (transportista) to know which cargos already quoted
  const myQuotesQuery = useQuery({
    queryKey: ['my-quotes', companyId],
    enabled: !!companyId && isTransportista,
    refetchInterval: 30_000,
    queryFn: async () => {
      const res = await api.get(`/quotes/my?limit=100`);
      return res.data?.data ?? [];
    },
  });

  const cargoDetailQuery = useQuery({
    queryKey: ['cargo-detail-bolsa', detailCargoId],
    enabled: !!detailCargoId,
    queryFn: async () => (await api.get(`/cargo/${detailCargoId}`)).data,
  });
  const cargoDetail = cargoDetailQuery.data;

  const myQuotesByCargoId = React.useMemo(() => {
    const map: Record<string, { id: string; amount: number; status: string; createdAt: string }> = {};
    for (const q of myQuotesQuery.data ?? []) {
      map[q.cargoId] = q;
    }
    return map;
  }, [myQuotesQuery.data]);

  const quoteMutation = useMutation({
    mutationFn: async ({ cargoId, amount, notes }: { cargoId: string; amount: number; notes: string }) => {
      return api.post('/quotes', {
        cargoId,
        amount,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bolsa'] });
      setQuotingCargoId(null);
      setQuoteAmount('');
      setQuoteNotes('');
    },
  });

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleGeoChange = (key: keyof GeoState, value: string) => {
    setGeo((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no soporta geolocalización');
      return;
    }
    setGeoLocating(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo((prev) => ({
          ...prev,
          lat: String(Math.round(pos.coords.latitude * 1e6) / 1e6),
          lng: String(Math.round(pos.coords.longitude * 1e6) / 1e6),
        }));
        setGeoLocating(false);
        setPage(1);
      },
      () => {
        setGeoError('No se pudo obtener tu ubicación');
        setGeoLocating(false);
      },
    );
  };

  const handleClearGeo = () => {
    setGeo({ lat: '', lng: '', radiusKm: '', province: '' });
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bolsa de cargas</h1>
          <p className="text-sm text-gray-500 mt-1">Cargas disponibles para cotizar</p>
        </div>
        {isTransportista && (
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setActiveTab('bolsa')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'bolsa' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Todas las cargas
            </button>
            <button
              onClick={() => setActiveTab('mis-cotizaciones')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === 'mis-cotizaciones' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Mis cotizaciones
              {(myQuotesQuery.data?.length ?? 0) > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {myQuotesQuery.data!.length > 9 ? '9+' : myQuotesQuery.data!.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Geographic search panel */}
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Buscar por ubicación</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUseMyLocation}
                loading={geoLocating}
                className="flex items-center gap-1 whitespace-nowrap"
              >
                <Navigation className="h-3.5 w-3.5" />
                Usar mi ubicación
              </Button>
              <span className="text-xs text-gray-400">o</span>
              <input
                type="number"
                placeholder="Lat"
                value={geo.lat}
                onChange={(e) => handleGeoChange('lat', e.target.value)}
                className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Lng"
                value={geo.lng}
                onChange={(e) => handleGeoChange('lng', e.target.value)}
                className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {geoError && <p className="text-xs text-red-500">{geoError}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Radio</span>
            <div className="flex items-center gap-1">
              {RADIUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleGeoChange('radiusKm', opt.value)}
                  disabled={!geoActive}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-40 ${
                    geo.radiusKm === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Provincia</span>
            <select
              value={geo.province}
              onChange={(e) => handleGeoChange('province', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {ARGENTINA_PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {(geoActive || geo.province) && (
            <div className="flex items-end">
              <button
                onClick={handleClearGeo}
                className="text-xs text-blue-600 hover:underline pb-2"
              >
                Limpiar ubicación
              </button>
            </div>
          )}

          {geoActive && (
            <div className="flex items-end pb-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                <MapPin className="h-3 w-3" />
                Cerca de vos
              </span>
            </div>
          )}
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por tipo, dirección, descripción..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {!geoActive && (
          <select
            value={`${filters.orderBy}:${filters.orderDir}`}
            onChange={(e) => {
              const [ob, od] = e.target.value.split(':');
              setFilters((prev) => ({ ...prev, orderBy: ob, orderDir: od }));
              setPage(1);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="createdAt:desc">Más reciente</option>
            <option value="estimatedValue:asc">Menor valor</option>
            <option value="estimatedValue:desc">Mayor valor</option>
            <option value="requiredDate:asc">Fecha más próxima</option>
          </select>
        )}
        {geoActive && (
          <div className="flex items-center px-3 py-2 border border-blue-200 rounded-lg bg-blue-50 text-xs text-blue-700 font-medium">
            Ordenado por distancia
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex items-center gap-2"
        >
          Filtros
          {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {filtersOpen && (
        <Card>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de carga</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {CARGO_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Peso mín. (t)</label>
              <input
                type="number"
                value={filters.minWeight}
                onChange={(e) => handleFilterChange('minWeight', e.target.value)}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Peso máx. (t)</label>
              <input
                type="number"
                value={filters.maxWeight}
                onChange={(e) => handleFilterChange('maxWeight', e.target.value)}
                placeholder="Sin límite"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor mín. (ARS)</label>
              <input
                type="number"
                value={filters.minValue}
                onChange={(e) => handleFilterChange('minValue', e.target.value)}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor máx. (ARS)</label>
              <input
                type="number"
                value={filters.maxValue}
                onChange={(e) => handleFilterChange('maxValue', e.target.value)}
                placeholder="Sin límite"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha desde</label>
              <input
                type="date"
                value={filters.requiredDateFrom}
                onChange={(e) => handleFilterChange('requiredDateFrom', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha hasta</label>
              <input
                type="date"
                value={filters.requiredDateTo}
                onChange={(e) => handleFilterChange('requiredDateTo', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters({
                    search: '',
                    type: '',
                    minWeight: '',
                    maxWeight: '',
                    minValue: '',
                    maxValue: '',
                    requiredDateFrom: '',
                    requiredDateTo: '',
                    orderBy: 'createdAt',
                    orderDir: 'desc',
                  });
                  setPage(1);
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Mis cotizaciones tab */}
      {activeTab === 'mis-cotizaciones' && (
        <div className="space-y-3">
          {myQuotesQuery.isLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" /></div>
          ) : !myQuotesQuery.data?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <ShoppingBag className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium">No enviaste cotizaciones todavía</p>
              <p className="text-sm mt-1">Explorá las cargas disponibles y cotizá las que te interesen</p>
            </div>
          ) : myQuotesQuery.data.map((q: any) => {
            const statusInfo = QUOTE_STATUS_LABEL[q.status] ?? { label: q.status, className: 'bg-gray-100 text-gray-600' };
            return (
              <Card key={q.id} className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{q.cargo?.type ?? '—'}</span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 line-clamp-1">
                    {q.cargo?.originAddress ?? '—'} → {q.cargo?.destinationAddress ?? '—'}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Cotizado el {format(new Date(q.createdAt), "dd 'de' MMMM", { locale: es })}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-gray-900">${q.amount.toLocaleString('es-AR')}</div>
                  {q.status === 'PENDIENTE' && (
                    <div className="text-xs text-yellow-600 mt-0.5 font-medium">
                      {q.cargo?.status === 'COTIZANDO' ? 'El dador está evaluando ofertas' : 'Esperando que el dador la vea'}
                      {' · '}enviada hace {formatDistanceToNow(new Date(q.createdAt), { locale: es })}
                    </div>
                  )}
                  {q.status === 'ACEPTADA' && (
                    <div className="text-xs text-green-600 mt-0.5 font-medium">Verificá los viajes</div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === 'bolsa' && (isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : !data?.data.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <ShoppingBag className="h-12 w-12 mb-3 opacity-50" />
          <p className="font-medium">No hay cargas disponibles</p>
          <p className="text-sm mt-1">Probá ajustando los filtros de búsqueda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.data.map((cargo) => {
            const distanceKm = (cargo as any).distanceKm as number | null | undefined;
            return (
              <Card key={cargo.id} className="hover:shadow-md transition-shadow flex flex-col">
                {/* Tipo + distancia + estado */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                      {cargo.type}
                    </span>
                    {geoActive && distanceKm != null && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                        <MapPin className="h-3 w-3" />
                        {distanceKm} km
                      </span>
                    )}
                  </div>
                  <StatusBadge status={cargo.status} />
                </div>

                {/* Ruta simplificada — jerarquía principal, legible de un vistazo */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
                  <span className="font-semibold text-gray-900 text-sm">
                    {formatAddressShort(cargo.originAddress)}
                  </span>
                </div>
                <div className="w-0.5 h-3 bg-gray-300 ml-[5px] mb-1" />
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-2.5 w-2.5 text-red-500 shrink-0" />
                  <span className="font-semibold text-gray-900 text-sm">
                    {formatAddressShort(cargo.destinationAddress)}
                  </span>
                </div>

                {/* Valor del flete — dato crítico, máxima jerarquía visual */}
                {cargo.estimatedValue != null && (
                  <div className="flex items-baseline gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2 mb-3">
                    <span className="text-xs font-bold text-green-700 uppercase tracking-wide">Valor ref.</span>
                    <span className="text-xl font-extrabold text-green-700 tracking-tight">
                      ${cargo.estimatedValue.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                )}

                {/* Meta secundaria: peso, fecha, empresa, cotizaciones */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mb-3">
                  {cargo.weightTons != null && (
                    <span className="flex items-center gap-1">
                      <Weight className="h-3 w-3" />
                      {cargo.weightTons} t
                    </span>
                  )}
                  {cargo.requiredDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(cargo.requiredDate), 'dd MMM', { locale: es })}
                    </span>
                  )}
                  <span className="ml-auto text-gray-400">{cargo.company?.name}</span>
                </div>

                <div className="text-xs mb-4">
                  <span className={`font-medium ${(cargo._count?.quotes ?? 0) > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                    {cargo._count?.quotes ?? 0}{' '}
                    {cargo._count?.quotes === 1 ? 'cotización' : 'cotizaciones'}
                  </span>
                </div>

                <div className="mt-auto">
                  {myQuotesByCargoId[cargo.id] ? (() => {
                    const mq = myQuotesByCargoId[cargo.id];
                    const si = QUOTE_STATUS_LABEL[mq.status] ?? { label: mq.status, className: 'bg-gray-100 text-gray-600' };
                    return (
                      <div className={`w-full rounded-lg px-3 py-2 text-center text-sm font-semibold ${si.className}`}>
                        {si.label} · ${mq.amount.toLocaleString('es-AR')}
                      </div>
                    );
                  })() : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 flex items-center gap-1"
                        onClick={() => setDetailCargoId(cargo.id)}
                      >
                        <Info className="h-3.5 w-3.5" /> Ver detalle
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => { setDetailCargoId(cargo.id); setQuotingCargoId(cargo.id); }}
                      >
                        Cotizar
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ))}

      {activeTab === 'bolsa' && data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-gray-500">
            Página {page} de {data.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= data.pages}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Cargo detail + quote modal */}
      {detailCargoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => { setDetailCargoId(null); setQuotingCargoId(null); setQuoteAmount(''); setQuoteNotes(''); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{cargoDetail?.type ?? 'Detalle de carga'}</h2>
                {cargoDetail && <StatusBadge status={cargoDetail.status} />}
              </div>
              <button onClick={() => { setDetailCargoId(null); setQuotingCargoId(null); setQuoteAmount(''); setQuoteNotes(''); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {cargoDetailQuery.isLoading ? (
              <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" /></div>
            ) : cargoDetail ? (
              <div className="p-6 space-y-5">
                {/* Route */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center pt-1">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <div className="w-0.5 flex-1 bg-gray-300 min-h-[28px] my-1" />
                      <MapPin className="h-3.5 w-3.5 text-red-500" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase">Origen</p>
                        <p className="text-sm font-semibold text-gray-900">{cargoDetail.originAddress}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase">Destino</p>
                        <p className="text-sm font-semibold text-gray-900">{cargoDetail.destinationAddress}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3">
                  {cargoDetail.weightTons && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Peso</p>
                      <p className="font-semibold text-gray-900">{cargoDetail.weightTons} t</p>
                    </div>
                  )}
                  {cargoDetail.estimatedValue && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Valor estimado</p>
                      <p className="font-semibold text-gray-900">${cargoDetail.estimatedValue.toLocaleString('es-AR')}</p>
                    </div>
                  )}
                  {cargoDetail.requiredDate && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Fecha requerida</p>
                      <p className="font-semibold text-gray-900">{new Date(cargoDetail.requiredDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  )}
                  {cargoDetail.volumeM3 && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Volumen</p>
                      <p className="font-semibold text-gray-900">{cargoDetail.volumeM3} m³</p>
                    </div>
                  )}
                </div>

                {cargoDetail.description && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">Descripción</p>
                    <p className="text-sm text-gray-700">{cargoDetail.description}</p>
                  </div>
                )}

                {/* Publisher */}
                <div className="flex items-center gap-2 text-sm text-gray-600 border-t pt-4">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span>Publicado por <strong>{cargoDetail.company?.name}</strong></span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-400">{cargoDetail.quotes?.length ?? cargoDetail._count?.quotes ?? 0} cotizaciones</span>
                </div>

                {/* Quote form */}
                {isTransportista && !myQuotesByCargoId[detailCargoId] && (
                  <div className="border-t pt-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-800">Tu cotización</p>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Monto en ARS <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        placeholder="Ej: 250000"
                        value={quoteAmount}
                        onChange={(e) => setQuoteAmount(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Notas (opcional)</label>
                      <textarea
                        placeholder="Ej: Incluye carga y descarga, seguro hasta $X..."
                        value={quoteNotes}
                        onChange={(e) => setQuoteNotes(e.target.value)}
                        rows={2}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {quoteMutation.isError && (
                      <p className="text-xs text-red-600">
                        {(quoteMutation.error as any)?.response?.data?.message || 'Error al enviar. Intentá de nuevo.'}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => { setDetailCargoId(null); setQuotingCargoId(null); setQuoteAmount(''); setQuoteNotes(''); }}>Cancelar</Button>
                      <Button size="sm" className="flex-1" loading={quoteMutation.isPending}
                        disabled={!quoteAmount || isNaN(parseFloat(quoteAmount))}
                        onClick={() => quoteMutation.mutate({ cargoId: detailCargoId, amount: parseFloat(quoteAmount), notes: quoteNotes })}>
                        Enviar cotización
                      </Button>
                    </div>
                  </div>
                )}
                {isTransportista && myQuotesByCargoId[detailCargoId] && (() => {
                  const mq = myQuotesByCargoId[detailCargoId];
                  const si = QUOTE_STATUS_LABEL[mq.status] ?? { label: mq.status, className: 'bg-gray-100 text-gray-600' };
                  return (
                    <div className={`border-t pt-4`}>
                      <div className={`rounded-xl px-4 py-3 text-center font-semibold ${si.className}`}>
                        Tu cotización: ${mq.amount.toLocaleString('es-AR')} · {si.label}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
