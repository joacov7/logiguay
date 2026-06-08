'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus, Package } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import api from '@/lib/api';
import { Cargo, PaginatedResponse } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CargasPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<PaginatedResponse<Cargo>>({
    queryKey: ['cargas', page],
    queryFn: async () => {
      const res = await api.get(`/cargo?page=${page}&limit=20`);
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cargas</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de cargas y envíos</p>
        </div>
        <Link href="/cargas/nueva">
          <Button>
            <Plus className="h-4 w-4" />
            Nueva carga
          </Button>
        </Link>
      </div>

      <Card padding="none">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : !data?.data.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Package className="h-12 w-12 mb-3 opacity-50" />
            <p className="font-medium">No hay cargas registradas</p>
            <p className="text-sm mt-1">Creá tu primera carga para comenzar</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead>Fecha requerida</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Cotizaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((cargo) => (
                <TableRow key={cargo.id}>
                  <TableCell className="font-medium">{cargo.type}</TableCell>
                  <TableCell className="max-w-xs truncate">{cargo.originAddress}</TableCell>
                  <TableCell className="max-w-xs truncate">{cargo.destinationAddress}</TableCell>
                  <TableCell>{cargo.weightTons ? `${cargo.weightTons}t` : '—'}</TableCell>
                  <TableCell>
                    {cargo.requiredDate
                      ? format(new Date(cargo.requiredDate), 'dd MMM yyyy', { locale: es })
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={cargo.status} />
                  </TableCell>
                  <TableCell>{cargo._count?.quotes || 0}</TableCell>
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
