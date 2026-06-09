'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation, ChevronRight, X, Truck, User, MapPin, CheckCircle, Circle, Clock, FileDown } from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/lib/export';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { Trip, TripEvent, PaginatedResponse } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_FILTERS = ['', 'ASIGNADO', 'EN_CAMINO_ORIGEN', 'EN_CARGA', 'EN_TRANSITO', 'EN_DESCARGA', 'FINALIZADO', 'CANCELADO'];
const FILTER_LABELS: Record<string, string> = {
  '': 'Todos', ASIGNADO: 'Asignados', EN_CAMINO_ORIGEN: 'En camino',
  EN_CARGA: 'Cargando', EN_TRANSITO: 'En tránsito', EN_DESCARGA: 'Descargando',
  FINALIZADO: 'Finalizados', CANCELADO: 'Cancelados',
};

const STAGES = [
  { status: 'ASIGNADO', label: 'Asignado', action: null },
  { status: 'EN_CAMINO_ORIGEN', label: 'En camino al origen', action: 'Salir hacia el origen' },
  { status: 'EN_CARGA', label: 'Cargando', action: 'Llegué al origen — iniciar carga' },
  { status: 'EN_TRANSITO', label: 'En tránsito', action: 'Carga completa — salir al destino' },
  { status: 'EN_DESCARGA', label: 'Descargando', action: 'Llegué al destino — iniciar descarga' },
  { status: 'FINALIZADO', label: 'Finalizado', action: 'Descarga completa — finalizar viaje' },
];

const STATUS_ORDER = STAGES.map((s) => s.status);

const EVENT_TYPE_LABELS: Record<string, string> = {
  LLEGADA_ORIGEN: 'Llegada al origen',
  SALIDA_ORIGEN: 'Salida del origen',
  LLEGADA_DESTINO: 'Llegada al destino',
  SALIDA_DESTINO: 'Entrega completada',
};

export default function ViajesPage() {
  const { user } = useAuth();
  const companyId = (user as any)?.companyId as string | undefined;
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getExportFilename = () => `viajes-${new Date().toISOString().slice(0, 10)}`;

  const handleExportExcel = () => {
    const rows = (data?.data ?? []).map((t) => ({
      Carga: t.cargo?.type ?? '',
      Origen: t.cargo?.originAddress ?? '',
      Destino: t.cargo?.destinationAddress ?? '',
      'Vehículo': (t.vehicle as any)?.plate ?? '',
      Chofer: (t.driver as any)?.user
        ? `${(t.driver as any).user.firstName} ${(t.driver as any).user.lastName}`
        : '',
      Tarifa: t.agreedRate ?? '',
      Estado: t.status,
      Iniciado: (t as any).startedAt ?? '',
      Finalizado: (t as any).finishedAt ?? '',
    }));
    exportToExcel(rows, getExportFilename(), 'Viajes');
    setExportOpen(false);
  };

  const handleExportPDF = () => {
    const columns = ['Carga', 'Origen', 'Destino', 'Vehículo', 'Chofer', 'Tarifa', 'Estado', 'Iniciado', 'Finalizado'];
    const rows = (data?.data ?? []).map((t) => [[
      t.cargo?.type ?? '',
      t.cargo?.originAddress ?? '',
      t.cargo?.destinationAddress ?? '',
      (t.vehicle as any)?.plate ?? '',
      (t.driver as any)?.user
        ? `${(t.driver as any).user.firstName} ${(t.driver as any).user.lastName}`
        : '',
      t.agreedRate ?? '',
      t.status,
      (t as any).startedAt ?? '',
      (t as any).finishedAt ?? '',
    ]]);
    exportToPDF('Viajes', columns, rows, getExportFilename());
    setExportOpen(false);
  };
  const [showAssign, setShowAssign] = useState(false);
  const [assignVehicle, setAssignVehicle] = useState('');
  const [assignDriver, setAssignDriver] = useState('');
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

  const tripQuery = useQuery<Trip>({
    queryKey: ['trip-detail', selectedTripId],
    enabled: !!selectedTripId,
    queryFn: async () => (await api.get(`/trips/${selectedTripId}`)).data,
  });

  const vehiclesQuery = useQuery({
    queryKey: ['vehicles-select', companyId],
    enabled: !!companyId && showAssign,
    queryFn: async () => (await api.get(`/vehicles?companyId=${companyId}&limit=100`)).data,
  });

  const driversQuery = useQuery({
    queryKey: ['drivers-select', companyId],
    enabled: !!companyId && showAssign,
    queryFn: async () => (await api.get(`/drivers?companyId=${companyId}&limit=100`)).data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['viajes'] });
    queryClient.invalidateQueries({ queryKey: ['trip-detail', selectedTripId] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ status, notes }: { status: string; notes?: string }) =>
      api.patch(`/trips/${selectedTripId}/status`, { status, notes }),
    onSuccess: invalidate,
  });

  const assignMutation = useMutation({
    mutationFn: () => api.patch(`/trips/${selectedTripId}/assign`, {
      vehicleId: assignVehicle,
      driverId: assignDriver,
    }),
    onSuccess: () => { invalidate(); setShowAssign(false); },
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.patch(`/trips/${selectedTripId}/cancel`, { reason: cancelReason }),
    onSuccess: () => { invalidate(); setShowCancel(false); setCancelReason(''); },
  });

  const trip = tripQuery.data;
  const currentStageIdx = trip ? STATUS_ORDER.indexOf(trip.status) : -1;
  const nextStage = currentStageIdx >= 0 && currentStageIdx < STAGES.length - 1
    ? STAGES[currentStageIdx + 1] : null;

  const closeModal = () => {
    setSelectedTripId(null);
    setShowCancel(false);
    setShowAssign(false);
    setCancelReason('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Viajes</h1>
          <p className="text-sm text-gray-500 mt-1">Seguimiento y gestión de viajes</p>
        </div>
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setExportOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FileDown className="h-4 w-4" />
            Exportar
          </button>
          {exportOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
              <button
                onClick={handleExportExcel}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Excel (.xlsx)
              </button>
              <button
                onClick={handleExportPDF}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                PDF
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {FILTER_LABELS[s]}
          </button>
        ))}
      </div>

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
                <TableHead>Vehículo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Tarifa</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((t) => (
                <TableRow key={t.id} className={selectedTripId === t.id ? 'bg-blue-50' : ''}
                  onClick={() => setSelectedTripId(t.id)}>
                  <TableCell className="font-medium">{t.cargo?.type || '—'}</TableCell>
                  <TableCell className="text-sm text-gray-500 max-w-xs">
                    <div className="truncate">{t.cargo?.originAddress || '—'}</div>
                    <div className="truncate">{t.cargo?.destinationAddress || '—'}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {(t.vehicle as any)?.plate
                      ? <span className="font-mono">{(t.vehicle as any).plate}</span>
                      : <span className="text-orange-500 text-xs">Sin asignar</span>}
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

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
          <span className="text-sm text-gray-500">Página {page} de {data.pages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.pages}>Siguiente</Button>
        </div>
      )}

      {/* Modal */}
      {selectedTripId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Detalle del viaje</h2>
                {trip && <StatusBadge status={trip.status} />}
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 mt-1"><X className="h-5 w-5" /></button>
            </div>

            {tripQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : trip ? (
              <div className="p-6 space-y-6">

                {/* Route */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-green-500 mt-0.5" />
                      <div className="w-0.5 h-8 bg-gray-300" />
                      <MapPin className="h-3 w-3 text-red-500" />
                    </div>
                    <div className="space-y-4 flex-1">
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase">Origen</p>
                        <p className="text-sm font-medium text-gray-800">{trip.cargo?.originAddress || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase">Destino</p>
                        <p className="text-sm font-medium text-gray-800">{trip.cargo?.destinationAddress || '—'}</p>
                      </div>
                    </div>
                  </div>
                  {trip.agreedRate && (
                    <div className="pt-2 border-t border-gray-200 flex justify-between text-sm">
                      <span className="text-gray-500">Tarifa acordada</span>
                      <span className="font-semibold text-gray-900">${trip.agreedRate.toLocaleString('es-AR')}</span>
                    </div>
                  )}
                </div>

                {/* Vehicle & Driver */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-xl p-3 border ${(trip.vehicle as any)?.plate ? 'border-gray-200 bg-white' : 'border-orange-200 bg-orange-50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="h-4 w-4 text-gray-400" />
                      <span className="text-xs font-medium text-gray-500 uppercase">Vehículo</span>
                    </div>
                    {(trip.vehicle as any)?.plate ? (
                      <>
                        <p className="font-mono font-bold text-gray-900">{(trip.vehicle as any).plate}</p>
                        <p className="text-xs text-gray-500">{(trip.vehicle as any).brand} {(trip.vehicle as any).model}</p>
                      </>
                    ) : (
                      <p className="text-sm text-orange-600 font-medium">Sin asignar</p>
                    )}
                  </div>
                  <div className={`rounded-xl p-3 border ${(trip.driver as any)?.user ? 'border-gray-200 bg-white' : 'border-orange-200 bg-orange-50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-xs font-medium text-gray-500 uppercase">Chofer</span>
                    </div>
                    {(trip.driver as any)?.user ? (
                      <>
                        <p className="font-medium text-gray-900">{(trip.driver as any).user.firstName} {(trip.driver as any).user.lastName}</p>
                        <p className="text-xs text-gray-500">{(trip.driver as any).user.phone || ''}</p>
                      </>
                    ) : (
                      <p className="text-sm text-orange-600 font-medium">Sin asignar</p>
                    )}
                  </div>
                </div>

                {/* Assign vehicle/driver */}
                {trip.status === 'ASIGNADO' && !(trip.vehicle as any)?.plate && (
                  !showAssign ? (
                    <Button variant="outline" className="w-full" onClick={() => setShowAssign(true)}>
                      Asignar vehículo y chofer
                    </Button>
                  ) : (
                    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-medium text-gray-700">Asignar vehículo y chofer</p>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Vehículo</label>
                        <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          value={assignVehicle} onChange={(e) => setAssignVehicle(e.target.value)}>
                          <option value="">Seleccionar...</option>
                          {vehiclesQuery.data?.data?.map((v: any) => (
                            <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Chofer</label>
                        <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          value={assignDriver} onChange={(e) => setAssignDriver(e.target.value)}>
                          <option value="">Seleccionar...</option>
                          {driversQuery.data?.data?.map((d: any) => (
                            <option key={d.id} value={d.id}>{d.user?.firstName} {d.user?.lastName} — Lic. {d.licenseNumber}</option>
                          ))}
                        </select>
                      </div>
                      {assignMutation.isError && (
                        <p className="text-xs text-red-600">Error al asignar. Verificá los datos.</p>
                      )}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowAssign(false)}>Cancelar</Button>
                        <Button size="sm" className="flex-1" loading={assignMutation.isPending}
                          disabled={!assignVehicle || !assignDriver}
                          onClick={() => assignMutation.mutate()}>
                          Confirmar asignación
                        </Button>
                      </div>
                    </div>
                  )
                )}

                {/* Stage progress */}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-3">Progreso del viaje</p>
                  <div className="space-y-2">
                    {STAGES.map((stage, idx) => {
                      const done = currentStageIdx > idx;
                      const current = currentStageIdx === idx;
                      return (
                        <div key={stage.status} className={`flex items-center gap-3 p-2.5 rounded-lg ${current ? 'bg-blue-50 border border-blue-200' : ''}`}>
                          {done ? (
                            <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                          ) : current ? (
                            <div className="h-5 w-5 rounded-full bg-blue-600 shrink-0 flex items-center justify-center">
                              <div className="h-2 w-2 rounded-full bg-white" />
                            </div>
                          ) : (
                            <Circle className="h-5 w-5 text-gray-300 shrink-0" />
                          )}
                          <span className={`text-sm ${done ? 'text-gray-400 line-through' : current ? 'text-blue-700 font-medium' : 'text-gray-400'}`}>
                            {stage.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Events timeline */}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-3">Historial de eventos</p>
                  {trip.events && trip.events.length > 0 ? (
                    <div className="space-y-2">
                      {trip.events.map((event: TripEvent) => (
                        <div key={event.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50">
                          <Clock className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">
                              {EVENT_TYPE_LABELS[event.type] ?? event.type}
                            </p>
                            <p className="text-xs text-gray-400">
                              {format(new Date(event.timestamp), 'dd/MM/yyyy HH:mm')}
                            </p>
                            {event.notes && (
                              <p className="text-xs text-gray-500 mt-0.5">{event.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Sin eventos registrados</p>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2 border-t">
                  {statusMutation.isError && (
                    <p className="text-xs text-red-600 text-center">Error al actualizar. Intentá de nuevo.</p>
                  )}
                  {nextStage?.action && trip.status !== 'ASIGNADO' || (trip.status === 'ASIGNADO' && (trip.vehicle as any)?.plate) ? (
                    nextStage?.action && (
                      <Button className="w-full" loading={statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ status: nextStage.status })}>
                        {nextStage.action}
                      </Button>
                    )
                  ) : null}

                  {trip.status !== 'FINALIZADO' && trip.status !== 'CANCELADO' && (
                    !showCancel ? (
                      <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setShowCancel(true)}>
                        Cancelar viaje
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2}
                          placeholder="Motivo de cancelación" value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)} />
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1"
                            onClick={() => { setShowCancel(false); setCancelReason(''); }}>Volver</Button>
                          <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700"
                            loading={cancelMutation.isPending} disabled={!cancelReason.trim()}
                            onClick={() => cancelMutation.mutate()}>
                            Confirmar cancelación
                          </Button>
                        </div>
                      </div>
                    )
                  )}

                  {trip.status === 'FINALIZADO' && (
                    <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm text-center flex items-center justify-center gap-2">
                      <CheckCircle className="h-4 w-4" /> Viaje finalizado correctamente
                    </div>
                  )}

                  {trip.finishedAt && (
                    <p className="text-xs text-center text-gray-400">
                      Finalizado el {format(new Date(trip.finishedAt), "dd 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                  )}
                </div>

              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
