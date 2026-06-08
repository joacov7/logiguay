'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import { Trip, PaginatedResponse } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_FILTERS = ['', 'EN_CAMINO_ORIGEN', 'EN_CARGA', 'EN_TRANSITO', 'EN_DESCARGA', 'FINALIZADO', 'CANCELADO'];
const LABELS: Record<string, string> = {
  '': 'Todos',
  EN_CAMINO_ORIGEN: 'En camino',
  EN_CARGA: 'Cargando',
  EN_TRANSITO: 'En tránsito',
  EN_DESCARGA: 'Descargando',
  FINALIZADO: 'Finalizados',
  CANCELADO: 'Cancelados',
};

export default function ViajesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse<Trip>>({
    queryKey: ['viajes', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/trips?${params}`);
      return res.data;
    },
  });

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
                <TableHead>Origen</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Chofer</TableHead>
                <TableHead>Tarifa</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Iniciado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((trip) => (
                <TableRow key={trip.id}>
                  <TableCell className="font-medium">{trip.cargo?.type || '—'}</TableCell>
                  <TableCell className="max-w-xs truncate">{trip.cargo?.originAddress || '—'}</TableCell>
                  <TableCell className="max-w-xs truncate">{trip.cargo?.destinationAddress || '—'}</TableCell>
                  <TableCell>{(trip.vehicle as any)?.plate || '—'}</TableCell>
                  <TableCell>
                    {trip.driver
                      ? `${(trip.driver as any)?.user?.firstName || ''} ${(trip.driver as any)?.user?.lastName || ''}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {trip.agreedRate ? `$${trip.agreedRate.toLocaleString('es-AR')}` : '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={trip.status} />
                  </TableCell>
                  <TableCell>
                    {trip.startedAt
                      ? format(new Date(trip.startedAt), 'dd/MM/yyyy HH:mm', { locale: es })
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

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
