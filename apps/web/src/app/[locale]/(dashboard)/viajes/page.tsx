'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation, ChevronRight, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { Trip, PaginatedResponse } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_FILTERS = ['', 'ASIGNADO', 'EN_CAMINO_ORIGEN', 'EN_CARGA', 'EN_TRANSITO', 'EN_DESCARGA', 'FINALIZADO', 'CANCELADO'];
const LABELS: Record<string, string> = {
  '': 'Todos',
  ASIGNADO: 'Asignados',
  EN_CAMINO_ORIGEN: 'En camino',
  EN_CARGA: 'Cargando',
  EN_TRANSITO: 'En tránsito',
  EN_DESCARGA: 'Descargando',
  FINALIZADO: 'Finalizados',
  CANCELADO: 'Cancelados',
};

const NEXT_STATUS: Record<string, { status: string; label: string } | null> = {
  ASIGNADO: { status: 'EN_CAMINO_ORIGEN', label: 'Iniciar viaje (En camino a origen)' },
  EN_CAMINO_ORIGEN: { status: 'EN_CARGA', label: 'Llegué al origen (Iniciar carga)' },
  EN_CARGA: { status: 'EN_TRANSITO', label: 'Salir con carga (En tránsito)' },
  EN_TRANSITO: { status: 'EN_DESCARGA', label: 'Llegué al destino (Iniciar descarga)' },
  EN_DESCARGA: { status: 'FINALIZADO', label: 'Descarga completa (Finalizar viaje)' },
  FINALIZADO: null,
  CANCELADO: null,
  PENDIENTE: null,
  PUBLICADO: null,
  COTIZANDO: null,
};

export default function ViajesPage() {
  const { user } = useAuth();
  const companyId = (user as any)?.companyId as string | undefined;
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<PaginatedResponse<Trip>>({
    queryKey: ['viajes', companyId, page, statusFilter],
    enabled: !!companyId,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      if (companyId) params.set('companyId', companyId);
      const res = await api.get(`/trips?${params}`);
      return res.data;
    },
  });

  const tripDetailQuery = useQuery<Trip>({
    queryKey: ['trip-detail', selectedTrip?.id],
    enabled: !!selectedTrip?.id,
    queryFn: async () => {
      const res = await api.get(`/trips/${selectedTrip!.id}`);
      return res.data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ tripId, status, notes }: { tripId: string; status: string; notes?: string }) =>
      api.patch(`/trips/${tripId}/status`, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viajes'] });
      queryClient.invalidateQueries({ queryKey: ['trip-detail', selectedTrip?.id] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ tripId, reason }: { tripId: string; reason: string }) =>
      api.patch(`/trips/${tripId}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viajes'] });
      queryClient.invalidateQueries({ queryKey: ['trip-detail', selectedTrip?.id] });
      setShowCancel(false);
      setCancelReason('');
    },
  });

  const trip = tripDetailQuery.data ?? selectedTrip;
  const nextStatus = trip ? NEXT_STATUS[trip.status] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Viajes</h1>
        <p className="text-sm text-gray-500 mt-1">Seguimiento y gestión de viajes</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {LABELS[s]}
          </button>
        ))}
      </div>

      <div className="grid gap-6 grid-cols-1">
        {/* Table */}
        <Card padding="none">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : !data?.data.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Navigation className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium">No hay viajes</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Carga</TableHead>
                  <TableHead>Origen → Destino</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tarifa</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((t) => (
                  <TableRow
                    key={t.id}
                    className={`cursor-pointer hover:bg-gray-50 ${selectedTrip?.id === t.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedTrip(t)}
                  >
                    <TableCell className="font-medium">{t.cargo?.type || '—'}</TableCell>
                    <TableCell className="text-sm text-gray-500 max-w-xs">
                      <div className="truncate">{t.cargo?.originAddress || '—'}</div>
                      <div className="truncate">{t.cargo?.destinationAddress || '—'}</div>
                    </TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell>{t.agreedRate ? `$${t.agreedRate.toLocaleString('es-AR')}` : '—'}</TableCell>
                    <TableCell><ChevronRight className="h-4 w-4 text-gray-400" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Detail modal */}
      {selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedTrip(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Detalle del viaje</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{selectedTrip.id}</p>
              </div>
              <button onClick={() => setSelectedTrip(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-gray-500">Estado</span>
                <StatusBadge status={trip?.status || selectedTrip.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tipo de carga</span>
                <span className="font-medium">{trip?.cargo?.type || '—'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 shrink-0">Origen</span>
                <span className="text-right">{trip?.cargo?.originAddress || '—'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 shrink-0">Destino</span>
                <span className="text-right">{trip?.cargo?.destinationAddress || '—'}</span>
              </div>
              {trip?.agreedRate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tarifa acordada</span>
                  <span className="font-medium">${trip.agreedRate.toLocaleString('es-AR')}</span>
                </div>
              )}
              {trip?.startedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Iniciado</span>
                  <span>{format(new Date(trip.startedAt), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
                </div>
              )}
              {trip?.finishedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Finalizado</span>
                  <span>{format(new Date(trip.finishedAt), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
                </div>
              )}
            </div>

            {statusMutation.isError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">
                Error al actualizar el estado. Intentá de nuevo.
              </div>
            )}

            <div className="space-y-2">
              {nextStatus && (
                <Button
                  className="w-full"
                  loading={statusMutation.isPending}
                  onClick={() => statusMutation.mutate({ tripId: selectedTrip.id, status: nextStatus.status })}
                >
                  {nextStatus.label}
                </Button>
              )}

              {trip?.status !== 'FINALIZADO' && trip?.status !== 'CANCELADO' && (
                <>
                  {!showCancel ? (
                    <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={() => setShowCancel(true)}>
                      Cancelar viaje
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        rows={2}
                        placeholder="Motivo de cancelación"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => { setShowCancel(false); setCancelReason(''); }}
                        >
                          Volver
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-red-600 hover:bg-red-700"
                          loading={cancelMutation.isPending}
                          disabled={!cancelReason.trim()}
                          onClick={() => cancelMutation.mutate({ tripId: selectedTrip.id, reason: cancelReason })}
                        >
                          Confirmar cancelación
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {trip?.status === 'FINALIZADO' && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm text-center">
                  ✓ Viaje finalizado correctamente
                </div>
              )}
            </div>
          </div>
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
