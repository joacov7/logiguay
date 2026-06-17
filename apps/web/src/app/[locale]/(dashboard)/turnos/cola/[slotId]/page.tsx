'use client';

import React, { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, CheckCircle, AlertTriangle, User, Truck, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import { io, Socket } from 'socket.io-client';

type BookingStatus = 'CONFIRMADO' | 'EN_ESPERA' | 'EN_ATENCION' | 'DEMORADO' | 'COMPLETADO' | 'CANCELADO';

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  CONFIRMADO:  { label: 'Confirmado',   color: '#6B7280', bg: '#F9FAFB' },
  EN_ESPERA:   { label: 'En espera',    color: '#92400E', bg: '#FEF3C7' },
  EN_ATENCION: { label: 'En atención',  color: '#065F46', bg: '#D1FAE5' },
  DEMORADO:    { label: 'Demorado',     color: '#991B1B', bg: '#FEE2E2' },
  COMPLETADO:  { label: 'Completado',   color: '#065F46', bg: '#D1FAE5' },
  CANCELADO:   { label: 'Cancelado',    color: '#6B7280', bg: '#F3F4F6' },
};

function StatusBadge({ status }: { status: BookingStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.CONFIRMADO;
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-semibold"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

function BookingRow({ b, onAttend, onComplete, attending, completing }: {
  b: any;
  onAttend: () => void;
  onComplete: () => void;
  attending: boolean;
  completing: boolean;
}) {
  return (
    <div className="flex items-center gap-4 py-3 px-4 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 text-sm">{b.company?.name ?? '—'}</span>
          <StatusBadge status={b.status} />
          {b.delayMinutes && (
            <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
              <AlertTriangle className="h-3 w-3" /> ~{b.delayMinutes} min de demora
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {b.driverName && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <User className="h-3 w-3" />{b.driverName}
            </span>
          )}
          {b.vehiclePlate && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Truck className="h-3 w-3" />{b.vehiclePlate}
            </span>
          )}
          {b.arrivedAt && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              Llegó {new Date(b.arrivedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        {b.delayNote && (
          <p className="text-xs text-red-500 mt-0.5 italic">{b.delayNote}</p>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        {b.status === 'EN_ESPERA' && (
          <Button size="sm" variant="primary" loading={attending} onClick={onAttend}>
            Atender
          </Button>
        )}
        {b.status === 'EN_ATENCION' && (
          <Button size="sm" variant="primary" loading={completing} onClick={onComplete}>
            <CheckCircle className="h-4 w-4 mr-1 inline" /> Completar
          </Button>
        )}
      </div>
    </div>
  );
}

export default function QueuePage() {
  const { slotId } = useParams<{ slotId: string }>();
  const qc = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const attendingId = useRef<string | null>(null);
  const completingId = useRef<string | null>(null);

  const { data: slot, isLoading } = useQuery({
    queryKey: ['slot-queue', slotId],
    queryFn: () => api.get(`/turnos/slots/${slotId}/queue`).then(r => r.data),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!slotId) return;
    const wsUrl = (process.env.NEXT_PUBLIC_WS_URL || '').replace(/\/$/, '');
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const socket = io(`${wsUrl}/tracking`, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;
    socket.emit('subscribe-slot-queue', slotId);
    socket.on('queue-update', (data: any) => {
      qc.setQueryData(['slot-queue', slotId], data);
    });
    return () => {
      socket.emit('unsubscribe-slot-queue', slotId);
      socket.disconnect();
    };
  }, [slotId, qc]);

  const attendMutation = useMutation({
    mutationFn: (id: string) => { attendingId.current = id; return api.patch(`/turnos/bookings/${id}/attend`, {}); },
    onSettled: () => { attendingId.current = null; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slot-queue', slotId] }),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => { completingId.current = id; return api.patch(`/turnos/bookings/${id}/complete`, {}); },
    onSettled: () => { completingId.current = null; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slot-queue', slotId] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!slot) return <div className="text-center text-gray-500 py-16">Turno no encontrado</div>;

  const bookings: any[] = slot.bookings ?? [];
  const active  = bookings.filter(b => ['EN_ESPERA', 'EN_ATENCION', 'DEMORADO'].includes(b.status));
  const pending = bookings.filter(b => b.status === 'CONFIRMADO');
  const done    = bookings.filter(b => ['COMPLETADO', 'CANCELADO'].includes(b.status));

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <a href="../" className="mt-1 p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </a>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{slot.plantName}</h1>
          <p className="text-sm text-gray-500">
            {new Date(slot.date).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' · '}{slot.startTime} – {slot.endTime}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-600 font-medium">Actualizando en tiempo real</span>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'En planta', value: active.length, color: 'text-amber-700 bg-amber-50 border-amber-200' },
          { label: 'En camino', value: pending.length, color: 'text-gray-700 bg-gray-50 border-gray-200' },
          { label: 'Completados', value: done.filter(b => b.status === 'COMPLETADO').length, color: 'text-green-700 bg-green-50 border-green-200' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-lg border px-4 py-3 text-center ${color}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {active.length > 0 && (
        <Card>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-4 pt-4 pb-2">
            En planta ahora ({active.length})
          </h2>
          {active.map(b => (
            <BookingRow
              key={b.id}
              b={b}
              onAttend={() => attendMutation.mutate(b.id)}
              onComplete={() => completeMutation.mutate(b.id)}
              attending={attendMutation.isPending && attendingId.current === b.id}
              completing={completeMutation.isPending && completingId.current === b.id}
            />
          ))}
        </Card>
      )}

      {pending.length > 0 && (
        <Card>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-4 pt-4 pb-2">
            Confirmados — en camino ({pending.length})
          </h2>
          {pending.map(b => (
            <BookingRow
              key={b.id}
              b={b}
              onAttend={() => attendMutation.mutate(b.id)}
              onComplete={() => completeMutation.mutate(b.id)}
              attending={false}
              completing={false}
            />
          ))}
        </Card>
      )}

      {done.length > 0 && (
        <Card>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4 pt-4 pb-2">
            Completados / Cancelados ({done.length})
          </h2>
          {done.map(b => (
            <BookingRow
              key={b.id}
              b={b}
              onAttend={() => {}}
              onComplete={() => {}}
              attending={false}
              completing={false}
            />
          ))}
        </Card>
      )}

      {bookings.length === 0 && (
        <Card>
          <p className="text-center text-gray-400 py-12 text-sm">Sin reservas para este turno todavía.</p>
        </Card>
      )}
    </div>
  );
}
