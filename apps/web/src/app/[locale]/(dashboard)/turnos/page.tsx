'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, Clock, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

interface TurnSlot {
  id: string;
  plantName: string;
  address: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  availableSpots: number;
  notes?: string;
  company: { id: string; name: string };
}

interface TurnBooking {
  id: string;
  status: string;
  driverName?: string;
  vehiclePlate?: string;
  notes?: string;
  slot: TurnSlot & { company: { id: string; name: string } };
}

export default function TurnosPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isDador = user?.role === 'DADOR' || user?.role === 'ADMIN';
  const isTransportista = user?.role === 'TRANSPORTISTA';

  const [showCreate, setShowCreate] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<TurnSlot | null>(null);
  const [filterDate, setFilterDate] = useState<string>(''); // '' = todos los próximos

  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(new Date(Date.now() + 86400_000), 'yyyy-MM-dd');

  const QUICK_DATES = [
    { label: 'Próximos', value: '' },
    { label: 'Hoy', value: today },
    { label: 'Mañana', value: tomorrow },
  ];

  // Create slot form
  const [form, setForm] = useState({
    plantName: '',
    address: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '08:00',
    endTime: '10:00',
    capacity: 1,
    notes: '',
  });

  // Booking form
  const [bookForm, setBookForm] = useState({ driverName: '', vehiclePlate: '', notes: '' });

  const { data: slots, isLoading: slotsLoading } = useQuery<TurnSlot[]>({
    queryKey: ['turnos-slots', isDador ? (user as any)?.companyId : null, filterDate],
    queryFn: async () => {
      const params: any = {};
      if (filterDate) params.date = filterDate;
      if (isDador) params.companyId = (user as any)?.companyId;
      const res = await api.get('/turnos/slots', { params });
      return res.data;
    },
  });

  const { data: myBookings } = useQuery<TurnBooking[]>({
    queryKey: ['turnos-bookings'],
    queryFn: async () => {
      const res = await api.get('/turnos/my-bookings');
      return res.data;
    },
    enabled: isTransportista,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await api.post('/turnos/slots', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turnos-slots'] });
      setShowCreate(false);
      setForm({ plantName: '', address: '', date: format(new Date(), 'yyyy-MM-dd'), startTime: '08:00', endTime: '10:00', capacity: 1, notes: '' });
    },
  });

  const bookMutation = useMutation({
    mutationFn: async ({ slotId, data }: { slotId: string; data: typeof bookForm }) => {
      const res = await api.post(`/turnos/slots/${slotId}/book`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turnos-slots'] });
      queryClient.invalidateQueries({ queryKey: ['turnos-bookings'] });
      setBookingSlot(null);
      setBookForm({ driverName: '', vehiclePlate: '', notes: '' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.patch(`/turnos/bookings/${bookingId}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turnos-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['turnos-slots'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Turnos de Carga</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isDador ? 'Gestioná los turnos de tu planta' : 'Reservá turnos en plantas y acopios'}
          </p>
        </div>
        {isDador && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nuevo turno
          </Button>
        )}
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {QUICK_DATES.map((q) => (
          <button
            key={q.value}
            onClick={() => setFilterDate(q.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filterDate === q.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {q.label}
          </button>
        ))}
        <span className="text-gray-300">|</span>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        />
      </div>

      {/* Create slot modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Crear turno</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de planta</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={form.plantName}
                    onChange={(e) => setForm((f) => ({ ...f, plantName: e.target.value }))}
                    placeholder="Ej: Planta Rosario Norte"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Dirección completa"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad (camiones)</label>
                  <input type="number" min={1} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: parseInt(e.target.value) || 1 }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora inicio</label>
                  <input type="time" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora fin</label>
                  <input type="time" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Instrucciones opcionales" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
                <Button loading={createMutation.isPending} onClick={() => createMutation.mutate(form)}>Crear turno</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Book slot modal */}
      {bookingSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Reservar turno</h2>
              <button onClick={() => setBookingSlot(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                <strong>{bookingSlot.plantName}</strong> · {bookingSlot.startTime} - {bookingSlot.endTime} · {format(new Date(bookingSlot.date), 'dd MMM yyyy', { locale: es })}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del chofer</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={bookForm.driverName} onChange={(e) => setBookForm((f) => ({ ...f, driverName: e.target.value }))} placeholder="Opcional" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patente del camión</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={bookForm.vehiclePlate} onChange={(e) => setBookForm((f) => ({ ...f, vehiclePlate: e.target.value }))} placeholder="Ej: ABC123" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2} value={bookForm.notes} onChange={(e) => setBookForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setBookingSlot(null)}>Cancelar</Button>
                <Button loading={bookMutation.isPending} onClick={() => bookMutation.mutate({ slotId: bookingSlot.id, data: bookForm })}>Confirmar reserva</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slots list */}
      {slotsLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : !slots?.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Calendar className="h-12 w-12 mb-3 opacity-50" />
          <p className="font-medium">No hay turnos para esta fecha</p>
          {isDador && <p className="text-sm mt-1">Creá el primer turno del día</p>}
        </div>
      ) : (
        <div className="grid gap-4">
          {slots.map((slot) => (
            <Card key={slot.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{slot.plantName}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${slot.availableSpots > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {slot.availableSpots > 0 ? `${slot.availableSpots} lugar${slot.availableSpots > 1 ? 'es' : ''}` : 'Completo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(slot.date), 'dd MMM yyyy', { locale: es })}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{slot.startTime} - {slot.endTime}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{slot.address}</span>
                  </div>
                  {slot.notes && <p className="text-xs text-gray-400 mt-1">{slot.notes}</p>}
                  {!isDador && <p className="text-xs text-gray-400 mt-1">{slot.company?.name}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  {isDador && (
                    <a href={`turnos/cola/${slot.id}`}>
                      <Button size="sm" variant="secondary">Ver cola</Button>
                    </a>
                  )}
                  {isTransportista && slot.availableSpots > 0 && (
                    <Button size="sm" onClick={() => setBookingSlot(slot)}>
                      Reservar
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* My bookings (transportista) */}
      {isTransportista && myBookings && myBookings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Mis reservas</h2>
          <div className="grid gap-3">
            {myBookings.map((b) => (
              <Card key={b.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{b.slot?.plantName}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${b.status === 'CONFIRMADO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {b.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {b.slot?.startTime} - {b.slot?.endTime} · {b.slot?.date ? format(new Date(b.slot.date), 'dd MMM yyyy', { locale: es }) : ''}
                    </p>
                    {b.vehiclePlate && <p className="text-xs text-gray-400 mt-1">Patente: {b.vehiclePlate}</p>}
                  </div>
                  {b.status === 'CONFIRMADO' && (
                    <Button size="sm" variant="outline" loading={cancelMutation.isPending} onClick={() => cancelMutation.mutate(b.id)}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
