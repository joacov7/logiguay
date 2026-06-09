'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, DollarSign, Clock, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import api from '@/lib/api';

const COMPANY_ID = 'placeholder';

type InvoiceType = 'VIAJE' | 'COMISION' | 'SUSCRIPCION';
type InvoiceStatus = 'PENDIENTE' | 'PAGADA' | 'CANCELADA';

interface Invoice {
  id: string;
  type: InvoiceType;
  amount: number;
  status: InvoiceStatus;
  createdAt: string;
  trip?: { id: string; status: string } | null;
}

interface InvoicesResponse {
  data: Invoice[];
  total: number;
  page: number;
  pages: number;
}

interface Summary {
  totalPaid: number;
  totalPending: number;
  totalCancelled: number;
  countPaid: number;
  countPending: number;
  countCancelled: number;
  byType: Record<string, { count: number; amount: number }>;
}

const TYPE_LABELS: Record<InvoiceType, string> = {
  VIAJE: 'Viaje',
  COMISION: 'Comisión',
  SUSCRIPCION: 'Suscripción',
};

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  PENDIENTE: 'Pendiente',
  PAGADA: 'Pagada',
  CANCELADA: 'Cancelada',
};

const STATUS_VARIANT: Record<InvoiceStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PAGADA: 'success',
  PENDIENTE: 'warning',
  CANCELADA: 'danger',
};

const TYPE_VARIANT: Record<InvoiceType, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  VIAJE: 'info',
  COMISION: 'warning',
  SUSCRIPCION: 'default',
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

export default function FacturacionPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<InvoiceType | ''>('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const queryClient = useQueryClient();

  const summaryQuery = useQuery<Summary>({
    queryKey: ['billing-summary', COMPANY_ID],
    queryFn: async () => {
      const res = await api.get(`/billing/invoices/${COMPANY_ID}/summary`);
      return res.data;
    },
  });

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (typeFilter) params.set('type', typeFilter);
  if (statusFilter) params.set('status', statusFilter);

  const invoicesQuery = useQuery<InvoicesResponse>({
    queryKey: ['billing-invoices', COMPANY_ID, page, typeFilter, statusFilter],
    queryFn: async () => {
      const res = await api.get(`/billing/invoices/${COMPANY_ID}?${params}`);
      return res.data;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/billing/invoice/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['billing-summary'] });
    },
  });

  const summary = summaryQuery.data;

  const statCards = [
    {
      label: 'Total facturado',
      value: summary ? formatCurrency(summary.totalPaid) : '-',
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Pendiente de cobro',
      value: summary ? formatCurrency(summary.totalPending) : '-',
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      label: 'Comisiones cobradas',
      value: summary ? formatCurrency(summary.byType?.COMISION?.amount ?? 0) : '-',
      icon: CreditCard,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Total de facturas',
      value: summary
        ? String((summary.countPaid ?? 0) + (summary.countPending ?? 0) + (summary.countCancelled ?? 0))
        : '-',
      icon: FileText,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
        <p className="text-sm text-gray-500 mt-1">Historial de facturas y resumen financiero</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${bg}`}>
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as InvoiceType | ''); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los tipos</option>
          {(Object.keys(TYPE_LABELS) as InvoiceType[]).map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as InvoiceStatus | ''); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          {(Object.keys(STATUS_LABELS) as InvoiceStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card padding="none">
        {invoicesQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : !invoicesQuery.data?.data.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText className="h-12 w-12 mb-3 opacity-50" />
            <p className="font-medium">No hay facturas</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Viaje</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoicesQuery.data.data.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-xs text-gray-500">
                      {invoice.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant={TYPE_VARIANT[invoice.type]}>
                        {TYPE_LABELS[invoice.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {invoice.trip ? (
                        <a
                          href={`/viajes/${invoice.trip.id}`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          {invoice.trip.id.slice(0, 8)}...
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(invoice.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[invoice.status]}>
                        {STATUS_LABELS[invoice.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(invoice.createdAt).toLocaleDateString('es-AR')}
                    </TableCell>
                    <TableCell>
                      {invoice.status === 'PENDIENTE' && (
                        <button
                          onClick={() => cancelMutation.mutate(invoice.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Cancelar
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {invoicesQuery.data.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Total: {invoicesQuery.data.total} facturas
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1 rounded text-gray-500 hover:text-gray-900 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-700">
                    {page} / {invoicesQuery.data.pages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(invoicesQuery.data.pages, p + 1))}
                    disabled={page === invoicesQuery.data.pages}
                    className="p-1 rounded text-gray-500 hover:text-gray-900 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
