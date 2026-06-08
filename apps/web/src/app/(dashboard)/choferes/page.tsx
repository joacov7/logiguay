'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import api from '@/lib/api';
import { Driver, PaginatedResponse } from '@/types';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ChoferesPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<PaginatedResponse<Driver>>({
    queryKey: ['choferes', page],
    queryFn: async () => {
      const res = await api.get(`/drivers?page=${page}&limit=20`);
      return res.data;
    },
  });

  const getLicenseStatus = (expiryDate: string) => {
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return 'VENCIDO';
    if (days <= 30) return 'POR_VENCER';
    return 'VIGENTE';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Choferes</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de conductores</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Agregar chofer
        </Button>
      </div>

      <Card padding="none">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : !data?.data.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Users className="h-12 w-12 mb-3 opacity-50" />
            <p className="font-medium">No hay choferes registrados</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>N° Licencia</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Estado licencia</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">
                    {driver.user?.firstName} {driver.user?.lastName}
                  </TableCell>
                  <TableCell className="text-gray-500">{driver.user?.email}</TableCell>
                  <TableCell>{driver.user?.phone || '—'}</TableCell>
                  <TableCell className="font-mono">{driver.licenseNumber}</TableCell>
                  <TableCell>
                    {format(new Date(driver.licenseExpiry), 'dd/MM/yyyy', { locale: es })}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={getLicenseStatus(driver.licenseExpiry)} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={driver.status === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO'} />
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
