'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, CheckCircle, Clock, Navigation, Phone, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STAGES = [
  { status: 'ASIGNADO', label: 'Asignado', emoji: '📋', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  { status: 'EN_CAMINO_ORIGEN', label: 'En camino al origen', emoji: '🚛', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  { status: 'EN_CARGA', label: 'Cargando', emoji: '📦', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  { status: 'EN_TRANSITO', label: 'En tránsito', emoji: '🛣️', color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  { status: 'EN_DESCARGA', label: 'Descargando', emoji: '🏭', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  { status: 'FINALIZADO', label: '¡Viaje completado!', emoji: '✅', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
];

const NEXT_ACTION: Record<string, { label: string; nextStatus: string; icon: string }> = {
  ASIGNADO: { label: 'Salir hacia el origen', nextStatus: 'EN_CAMINO_ORIGEN', icon: '🚀' },
  EN_CAMINO_ORIGEN: { label: 'Llegué al origen — iniciar carga', nextStatus: 'EN_CARGA', icon: '📦' },
  EN_CARGA: { label: 'Carga completa — salir al destino', nextStatus: 'EN_TRANSITO', icon: '🛣️' },
  EN_TRANSITO: { label: 'Llegué al destino — iniciar descarga', nextStatus: 'EN_DESCARGA', icon: '🏭' },
  EN_DESCARGA: { label: 'Descarga completa — finalizar viaje', nextStatus: 'FINALIZADO', icon: '✅' },
};

const EVENT_LABELS: Record<string, string> = {
  LLEGADA_ORIGEN: 'Llegada al origen',
  SALIDA_ORIGEN: 'Salida del origen',
  LLEGADA_DESTINO: 'Llegada al destino',
  SALIDA_DESTINO: 'Entrega completada',
};

export default function MiViajePage() {
  const { user } = useAuth();
  const driverId = (user as any)?.driverId as string | undefined;
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<{ tripId: string; nextStatus: string; label: string } | null>(null);

  const { data: trips, isLoading } = useQuery<any[]>({
    queryKey: ['mi-viaje', driverId],
    enabled: !!driverId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const res = await api.get(`/trips?driverId=${driverId}&limit=5`);
      return res.data?.data ?? [];
    },
  });

  const activeTrip = trips?.find((t) =>
    !['FINALIZADO', 'CANCELADO'].includes(t.status)
  );

  const tripDetailQuery = useQuery({
    queryKey: ['mi-viaje-detail', activeTrip?.id],
    enabled: !!activeTrip?.id,
    refetchInterval: 30_000,
    queryFn: async () => (await api.get(`/trips/${activeTrip!.id}`)).data,
  });

  const trip = tripDetailQuery.data ?? activeTrip;

  const statusMutation = useMutation({
    mutationFn: ({ tripId, status }: { tripId: string; status: string }) =>
      api.patch(`/trips/${tripId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mi-viaje'] });
      queryClient.invalidateQueries({ queryKey: ['mi-viaje-detail'] });
      setConfirmAction(null);
    },
  });

  const currentStage = STAGES.find((s) => s.status === trip?.status);
  const nextAction = trip ? NEXT_ACTION[trip.status] : null;
  const currentIdx = STAGES.findIndex((s) => s.status === trip?.status);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full" />
        <p className="text-gray-500 font-medium">Cargando viaje...</p>
      </div>
    );
  }

  if (!driverId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-4">
        <AlertTriangle className="h-14 w-14 text-yellow-400" />
        <h2 className="text-xl font-bold text-gray-800">Cuenta sin chofer asociado</h2>
        <p className="text-gray-500 text-sm max-w-xs">Tu cuenta de usuario no está vinculada a un perfil de chofer. Contactá a tu empresa para que lo configure.</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-4">
        <div className="text-6xl">🚛</div>
        <h2 className="text-xl font-bold text-gray-800">Sin viaje activo</h2>
        <p className="text-gray-500 text-sm max-w-xs">No tenés ningún viaje asignado en este momento. Tu empresa te notificará cuando haya uno nuevo.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8">

      {/* Current status banner */}
      <div className={`rounded-2xl p-5 flex items-center gap-4 ${currentStage?.color ?? 'bg-gray-100'}`}>
        <span className="text-4xl">{currentStage?.emoji ?? '🚛'}</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Estado actual</p>
          <p className="text-lg font-bold">{currentStage?.label ?? trip.status}</p>
        </div>
      </div>

      {/* Route card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Ruta</p>
        <div className="flex gap-4">
          <div className="flex flex-col items-center pt-1 gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <div className="w-0.5 flex-1 bg-gray-200 min-h-[32px]" />
            <MapPin className="h-3.5 w-3.5 text-red-500" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-xs text-gray-400 font-medium">ORIGEN</p>
              <p className="font-semibold text-gray-900 text-base leading-snug">{trip.cargo?.originAddress || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">DESTINO</p>
              <p className="font-semibold text-gray-900 text-base leading-snug">{trip.cargo?.destinationAddress || '—'}</p>
            </div>
          </div>
        </div>

        {trip.cargo?.type && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">Tipo de carga</span>
            <span className="font-semibold text-gray-800">{trip.cargo.type}</span>
          </div>
        )}
        {trip.cargo?.weightTons && (
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-500">Peso</span>
            <span className="font-semibold text-gray-800">{trip.cargo.weightTons} t</span>
          </div>
        )}
      </div>

      {/* Progress steps */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Progreso</p>
        <div className="space-y-3">
          {STAGES.map((stage, idx) => {
            const done = currentIdx > idx;
            const current = currentIdx === idx;
            const upcoming = currentIdx < idx;
            return (
              <div key={stage.status} className={`flex items-center gap-3 py-1 ${upcoming ? 'opacity-35' : ''}`}>
                <div className={`w-3 h-3 rounded-full shrink-0 transition-all ${done ? 'bg-green-500' : current ? stage.dot + ' ring-4 ring-offset-1 ring-opacity-30 ' + stage.dot.replace('bg-', 'ring-') : 'bg-gray-200'}`} />
                <span className={`text-sm font-medium ${done ? 'text-gray-400 line-through' : current ? 'text-gray-900' : 'text-gray-400'}`}>
                  {stage.emoji} {stage.label}
                </span>
                {done && <CheckCircle className="h-4 w-4 text-green-500 ml-auto shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* BIG ACTION BUTTON */}
      {nextAction && trip.status !== 'FINALIZADO' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Próxima acción</p>
          <button
            onClick={() => setConfirmAction({ tripId: trip.id, nextStatus: nextAction.nextStatus, label: nextAction.label })}
            disabled={statusMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-60
              text-white font-bold text-lg rounded-2xl py-6 px-6 shadow-lg shadow-green-200
              flex items-center justify-center gap-3 transition-all active:scale-95 touch-manipulation"
          >
            <span className="text-2xl">{nextAction.icon}</span>
            <span className="leading-tight text-left">{nextAction.label}</span>
          </button>
        </div>
      )}

      {trip.status === 'FINALIZADO' && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <p className="text-xl font-bold text-green-800">¡Viaje completado!</p>
          {trip.finishedAt && (
            <p className="text-sm text-green-600 mt-1">
              {format(new Date(trip.finishedAt), "dd 'de' MMMM 'a las' HH:mm", { locale: es })}
            </p>
          )}
          {trip.agreedRate && (
            <p className="text-base font-semibold text-green-700 mt-3">
              Tarifa: ${trip.agreedRate.toLocaleString('es-AR')}
            </p>
          )}
        </div>
      )}

      {/* Events log */}
      {trip.events?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Historial</p>
          <div className="space-y-3">
            {trip.events.map((ev: any) => (
              <div key={ev.id} className="flex gap-3 items-start">
                <Clock className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{EVENT_LABELS[ev.type] ?? ev.type}</p>
                  <p className="text-xs text-gray-400">{format(new Date(ev.timestamp), 'dd/MM HH:mm')}</p>
                  {ev.notes && <p className="text-xs text-gray-500 mt-0.5">{ev.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact transport company */}
      {trip.transportCompany && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Empresa</p>
          <p className="font-semibold text-gray-900">{trip.transportCompany.name}</p>
          {trip.transportCompany.phone && (
            <a href={`tel:${trip.transportCompany.phone}`}
              className="mt-3 flex items-center gap-2 text-green-600 font-medium text-sm">
              <Phone className="h-4 w-4" /> Llamar a la empresa
            </a>
          )}
        </div>
      )}

      {/* Confirm dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="text-center">
              <div className="text-4xl mb-2">
                {NEXT_ACTION[trip.status]?.icon ?? '❓'}
              </div>
              <h3 className="text-lg font-bold text-gray-900">¿Confirmar acción?</h3>
              <p className="text-sm text-gray-500 mt-1">{confirmAction.label}</p>
            </div>
            {statusMutation.isError && (
              <p className="text-sm text-red-600 text-center">Error al actualizar. Intentá de nuevo.</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={statusMutation.isPending}
                className="py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-base active:bg-gray-100 touch-manipulation"
              >
                Cancelar
              </button>
              <button
                onClick={() => statusMutation.mutate({ tripId: confirmAction.tripId, status: confirmAction.nextStatus })}
                disabled={statusMutation.isPending}
                className="py-3.5 rounded-xl bg-green-600 text-white font-bold text-base active:bg-green-700 disabled:opacity-60 touch-manipulation"
              >
                {statusMutation.isPending ? '...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
