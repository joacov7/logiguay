'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Package, Eye, FileDown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import api from '@/lib/api';
import { exportToExcel, exportToPDF } from '@/lib/export';
import { Cargo, PaginatedResponse, Quote } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'PUBLICADO', label: 'Publicado' },
  { value: 'COTIZANDO', label: 'Cotizando' },
  { value: 'ASIGNADO', label: 'Asignado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];


const EXPORT_COLUMNS = ['Tipo', 'Descripción', 'Peso (t)', 'Volumen (m³)', 'Origen', 'Destino', 'Fecha requerida', 'Valor estimado', 'Estado'];

function getFilename() {
  return `cargas-${format(new Date(), 'yyyy-MM-dd')}`;
}

function buildExcelData(cargas: Cargo[]) {
  return cargas.map((c) => ({
    'Tipo': c.type ?? '',
    'Descripción': (c as any).description ?? '',
    'Peso (t)': c.weightTons ?? '',
    'Volumen (m³)': (c as any).volumeM3 ?? '',
    'Origen': c.originAddress ?? '',
    'Destino': c.destinationAddress ?? '',
    'Fecha requerida': c.requiredDate ? format(new Date(c.requiredDate), 'dd/MM/yyyy') : '',
    'Valor estimado': c.estimatedValue ?? '',
    'Estado': c.status ?? '',
  }));
}

function buildPDFRows(cargas: Cargo[]): (string | number)[][][] {
  return cargas.map((c) => [[
    c.type ?? '',
    (c as any).description ?? '',
    c.weightTons ?? '',
    (c as any).volumeM3 ?? '',
    c.originAddress ?? '',
    c.destinationAddress ?? '',
    c.requiredDate ? format(new Date(c.requiredDate), 'dd/MM/yyyy') : '',
    c.estimatedValue ?? '',
    c.status ?? '',
  ]]);
}

export default function CargasPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCargoId, setSelectedCargoId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    if (exportOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportOpen]);

  function handleExportExcel() {
    const cargas = data?.data ?? [];
    exportToExcel(buildExcelData(cargas), getFilename(), 'Cargas');
    setExportOpen(false);
  }

  function handleExportPDF() {
    const cargas = data?.data ?? [];
    exportToPDF('Cargas', EXPORT_COLUMNS, buildPDFRows(cargas), getFilename());
    setExportOpen(false);
  }

  const { data, isLoading } = useQuery<PaginatedResponse<Cargo>>({
    queryKey: ['cargas', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/cargo?${params.toString()}`);
      return res.data;
    },
  });

  const { data: quotesData, isLoading: detailLoading } = useQuery<{ data: Quote[] }>({
    queryKey: ['cargo-quotes', selectedCargoId],
    queryFn: async () => {
      const res = await api.get(`/quotes/cargo/${selectedCargoId}`);
      return res.data;
    },
    enabled: !!selectedCargoId,
  });

  const selectQuoteMutation = useMutation({
    mutationFn: async ({ quoteId }: { cargoId: string; quoteId: string }) => {
      const res = await api.patch(`/quotes/${quoteId}/accept`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargas'] });
      queryClient.invalidateQueries({ queryKey: ['cargo-quotes', selectedCargoId] });
      setSelectedCargoId(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cargas</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de cargas y envíos</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={exportRef}>
            <Button variant="outline" onClick={() => setExportOpen((v) => !v)}>
              <FileDown className="h-4 w-4 mr-1" />
              Exportar
            </Button>
            {exportOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={handleExportExcel}
                >
                  Excel (.xlsx)
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={handleExportPDF}
                >
                  PDF
                </button>
              </div>
            )}
          </div>
          <Link href="/cargas/nueva">
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Nueva carga
            </Button>
          </Link>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Filtrar por estado:</span>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setStatusFilter(opt.value); setPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === opt.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
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
                <TableHead>Valor</TableHead>
                <TableHead>Fecha requerida</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Ofertas</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((cargo) => (
                <TableRow key={cargo.id}>
                  <TableCell className="font-medium">{cargo.type}</TableCell>
                  <TableCell className="max-w-xs truncate">{cargo.originAddress}</TableCell>
                  <TableCell className="max-w-xs truncate">{cargo.destinationAddress}</TableCell>
                  <TableCell>{cargo.weightTons != null ? `${cargo.weightTons}t` : '—'}</TableCell>
                  <TableCell>
                    {cargo.estimatedValue != null
                      ? `$${cargo.estimatedValue.toLocaleString('es-AR')}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {cargo.requiredDate
                      ? format(new Date(cargo.requiredDate), 'dd MMM yyyy', { locale: es })
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={cargo.status} />
                  </TableCell>
                  <TableCell>{cargo._count?.quotes ?? 0}</TableCell>
                  <TableCell>
                    {(cargo._count?.quotes ?? 0) > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedCargoId(cargo.id)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        Ver ofertas ({cargo._count?.quotes})
                      </Button>
                    )}
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

      {/* Quotes modal */}
      {selectedCargoId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Cotizaciones recibidas</h2>
              <button
                onClick={() => setSelectedCargoId(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                </div>
              ) : !quotesData?.data?.length ? (
                <p className="text-center text-gray-400 py-8">No hay cotizaciones aún</p>
              ) : (
                <div className="space-y-3">
                  {quotesData.data.map((quote) => (
                    <div
                      key={quote.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          ${quote.amount.toLocaleString('es-AR')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {(quote.transportCompany as { name: string } | undefined)?.name ?? quote.transportCompanyId}
                        </p>
                        {quote.notes && (
                          <p className="text-xs text-gray-400 mt-1">{quote.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={quote.status} />
                        {quote.status === 'PENDIENTE' && (
                          <Button
                            size="sm"
                            loading={selectQuoteMutation.isPending}
                            onClick={() =>
                              selectQuoteMutation.mutate({
                                cargoId: selectedCargoId,
                                quoteId: quote.id,
                              })
                            }
                          >
                            Seleccionar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
