'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Truck, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import api from '@/lib/api';
import { Vehicle, PaginatedResponse } from '@/types';

export default function FlotaPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<PaginatedResponse<Vehicle>>({
    queryKey: ['flota', page],
    queryFn: async () => {
      const res = await api.get(`/vehicles?page=${page}&limit=20`);
      return res.data;
    },
  });

  const vehicleTypeLabel: Record<string, string> = {
    CAMION: 'Camión',
    ACOPLADO: 'Acoplado',
    SEMIRREMOLQUE: 'Semirremolque',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flota</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de vehículos</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Agregar vehículo
        </Button>
      </div>

      <Card padding="none">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : !data?.data.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Truck className="h-12 w-12 mb-3 opacity-50" />
            <p className="font-medium">No hay vehículos registrados</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Marca / Modelo</TableHead>
                <TableHead>Año</TableHead>
                <TableHead>Capacidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Viajes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-medium">{v.plate}</TableCell>
                  <TableCell>{vehicleTypeLabel[v.type] || v.type}</TableCell>
                  <TableCell>
                    {[v.brand, v.model].filter(Boolean).join(' ') || '—'}
                  </TableCell>
                  <TableCell>{v.year || '—'}</TableCell>
                  <TableCell>
                    {v.capacityTons ? `${v.capacityTons}t` : ''}
                    {v.capacityTons && v.capacityM3 ? ' / ' : ''}
                    {v.capacityM3 ? `${v.capacityM3}m³` : ''}
                    {!v.capacityTons && !v.capacityM3 ? '—' : ''}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={v.status} />
                  </TableCell>
                  <TableCell>{(v as any)._count?.trips || 0}</TableCell>
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
