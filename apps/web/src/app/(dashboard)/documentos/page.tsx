'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import api from '@/lib/api';
import { Document, PaginatedResponse } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DocumentosPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<PaginatedResponse<Document>>({
    queryKey: ['documentos', page],
    queryFn: async () => {
      const res = await api.get(`/documents?page=${page}&limit=20`);
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
          <p className="text-sm text-gray-500 mt-1">Control de vencimientos</p>
        </div>
        <Button>
          <FileText className="h-4 w-4" />
          Cargar documento
        </Button>
      </div>

      <Card padding="none">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : !data?.data.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText className="h-12 w-12 mb-3 opacity-50" />
            <p className="font-medium">No hay documentos cargados</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entidad</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Cargado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <span className="capitalize text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {doc.entityType}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{doc.type}</TableCell>
                  <TableCell>
                    <StatusBadge status={doc.status} />
                  </TableCell>
                  <TableCell>
                    {doc.expiresAt
                      ? format(new Date(doc.expiresAt), 'dd/MM/yyyy', { locale: es })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-gray-500 text-xs">
                    {format(new Date(doc.createdAt), 'dd/MM/yyyy', { locale: es })}
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
