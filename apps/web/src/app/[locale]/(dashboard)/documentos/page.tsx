'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, RefreshCw, Clock, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Document, Vehicle, Driver } from '@/types';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

const ENTITY_TYPES = ['VEHICLE', 'DRIVER', 'COMPANY'] as const;
const DOC_TYPES = ['SEGURO', 'CEDULA', 'LICENCIA', 'RTO', 'HABILITACION', 'OTRO'] as const;
const STATUS_OPTIONS = ['VIGENTE', 'POR_VENCER', 'VENCIDO'] as const;

interface DocumentWithRelations extends Document {
  vehicleId?: string;
  driverId?: string;
  vehicle?: { id: string; plate: string; brand?: string; model?: string };
  driver?: { id: string; firstName: string; lastName: string };
}

interface CheckExpiriesResult {
  total: number;
  recalculated: number;
  vencidos: number;
  porVencer: number;
  vigentes: number;
}

function EntityLabel({ doc }: { doc: DocumentWithRelations }) {
  if (doc.vehicle) {
    return (
      <div>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Vehículo</span>
        <span className="ml-2 text-sm text-gray-700">{doc.vehicle.plate}</span>
        {doc.vehicle.brand && (
          <span className="ml-1 text-xs text-gray-400">{doc.vehicle.brand} {doc.vehicle.model}</span>
        )}
      </div>
    );
  }
  if (doc.driver) {
    return (
      <div>
        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">Chofer</span>
        <span className="ml-2 text-sm text-gray-700">{doc.driver.firstName} {doc.driver.lastName}</span>
      </div>
    );
  }
  return (
    <div>
      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">{doc.entityType}</span>
      <span className="ml-2 text-xs text-gray-400">{doc.entityId}</span>
    </div>
  );
}

function DaysRemaining({ expiresAt }: { expiresAt?: string }) {
  if (!expiresAt) return <span className="text-gray-400">—</span>;
  const days = differenceInDays(new Date(expiresAt), new Date());
  if (days < 0) {
    return <span className="text-red-600 font-medium text-xs">Vencido hace {Math.abs(days)}d</span>;
  }
  if (days < 7) {
    return <span className="text-red-600 font-medium text-xs">{days}d restantes</span>;
  }
  if (days < 30) {
    return <span className="text-yellow-600 font-medium text-xs">{days}d restantes</span>;
  }
  return <span className="text-gray-500 text-xs">{days}d</span>;
}

export default function DocumentosPage() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [filterEntityType, setFilterEntityType] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    entityType: 'VEHICLE' as 'VEHICLE' | 'DRIVER',
    entityId: '',
    vehicleId: '',
    driverId: '',
    type: 'SEGURO',
    fileUrl: '',
    expiresAt: '',
  });

  const params = new URLSearchParams({ companyId: companyId ?? '' });
  if (filterEntityType) params.set('entityType', filterEntityType);
  if (filterType) params.set('type', filterType);
  if (filterStatus) params.set('status', filterStatus);

  const { data: documents, isLoading } = useQuery<DocumentWithRelations[]>({
    queryKey: ['documentos', companyId, filterEntityType, filterType, filterStatus],
    queryFn: async () => {
      const res = await api.get(`/documents?${params}`);
      return res.data;
    },
    enabled: !!companyId,
  });

  const { data: vehicles } = useQuery<{ data: Vehicle[] }>({
    queryKey: ['vehicles-list'],
    queryFn: async () => {
      const res = await api.get('/vehicles');
      return res.data;
    },
  });

  const { data: drivers } = useQuery<{ data: Driver[] }>({
    queryKey: ['drivers-list'],
    queryFn: async () => {
      const res = await api.get('/drivers');
      return res.data;
    },
  });

  const { data: expiring } = useQuery<DocumentWithRelations[]>({
    queryKey: ['documentos-expiring', companyId],
    queryFn: async () => {
      const res = await api.get(`/documents/expiring/${companyId}?daysAhead=30`);
      return res.data;
    },
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/documents', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      queryClient.invalidateQueries({ queryKey: ['documentos-expiring'] });
      setIsModalOpen(false);
      setForm({ entityType: 'VEHICLE', entityId: '', vehicleId: '', driverId: '', type: 'SEGURO', fileUrl: '', expiresAt: '' });
      showToast('Documento creado correctamente', 'success');
    },
    onError: () => showToast('Error al crear el documento', 'error'),
  });

  const checkExpiriesMutation = useMutation({
    mutationFn: () => api.post(`/documents/check-expiries/${companyId}`),
    onSuccess: (res) => {
      const result: CheckExpiriesResult = res.data;
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      queryClient.invalidateQueries({ queryKey: ['documentos-expiring'] });
      showToast(
        `Verificación completa: ${result.total} docs, ${result.recalculated} actualizados. Vencidos: ${result.vencidos}, Por vencer: ${result.porVencer}, Vigentes: ${result.vigentes}`,
        'success',
      );
    },
    onError: () => showToast('Error al verificar vencimientos', 'error'),
  });

  const handleFormChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'entityType') {
        next.entityId = '';
        next.vehicleId = '';
        next.driverId = '';
      }
      if (field === 'entityId') {
        if (prev.entityType === 'VEHICLE') next.vehicleId = value;
        else next.driverId = value;
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.entityId || !form.fileUrl) {
      showToast('Completa todos los campos obligatorios', 'warning');
      return;
    }
    createMutation.mutate(form);
  };

  const vehicleList = (vehicles as { data?: Vehicle[] })?.data ?? (vehicles as unknown as Vehicle[]) ?? [];
  const driverList = (drivers as { data?: Driver[] })?.data ?? (drivers as unknown as Driver[]) ?? [];

  const stats = {
    total: documents?.length ?? 0,
    vigentes: documents?.filter((d) => d.status === 'VIGENTE').length ?? 0,
    porVencer: documents?.filter((d) => d.status === 'POR_VENCER').length ?? 0,
    vencidos: documents?.filter((d) => d.status === 'VENCIDO').length ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión y control de vencimientos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => checkExpiriesMutation.mutate()}
            loading={checkExpiriesMutation.isPending}
          >
            <RefreshCw className="h-4 w-4" />
            Verificar vencimientos
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Agregar documento
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-gray-400" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{stats.vigentes}</p>
              <p className="text-xs text-gray-500">Vigentes</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-yellow-600">{stats.porVencer}</p>
              <p className="text-xs text-gray-500">Por vencer</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.vencidos}</p>
              <p className="text-xs text-gray-500">Vencidos</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterEntityType}
          onChange={(e) => setFilterEntityType(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las entidades</option>
          {ENTITY_TYPES.map((et) => (
            <option key={et} value={et}>{et}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los tipos</option>
          {DOC_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {/* Main Table */}
      <Card padding="none">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : !documents?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText className="h-12 w-12 mb-3 opacity-50" />
            <p className="font-medium">No hay documentos</p>
            <p className="text-sm">Agrega el primer documento para comenzar</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entidad</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Archivo</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Restante</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Cargado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <EntityLabel doc={doc} />
                  </TableCell>
                  <TableCell className="font-medium text-sm">{doc.type}</TableCell>
                  <TableCell>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm underline truncate max-w-[160px] block"
                    >
                      Ver archivo
                    </a>
                  </TableCell>
                  <TableCell className="text-sm">
                    {doc.expiresAt
                      ? format(new Date(doc.expiresAt), 'dd/MM/yyyy', { locale: es })
                      : <span className="text-gray-400">Sin vencimiento</span>}
                  </TableCell>
                  <TableCell>
                    <DaysRemaining expiresAt={doc.expiresAt} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={doc.status} />
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

      {/* Próximos a vencer */}
      {expiring && expiring.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Próximos a vencer (30 días)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {expiring.map((doc) => {
              const days = doc.expiresAt ? differenceInDays(new Date(doc.expiresAt), new Date()) : null;
              const urgentColor = days !== null && days < 0
                ? 'border-red-300 bg-red-50'
                : days !== null && days < 7
                ? 'border-red-200 bg-red-50'
                : 'border-yellow-200 bg-yellow-50';
              return (
                <div key={doc.id} className={`rounded-lg border p-4 ${urgentColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-800">{doc.type}</span>
                    <StatusBadge status={doc.status} />
                  </div>
                  <EntityLabel doc={doc} />
                  <div className="mt-2 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    <DaysRemaining expiresAt={doc.expiresAt} />
                    {doc.expiresAt && (
                      <span className="text-xs text-gray-500">
                        ({format(new Date(doc.expiresAt), 'dd/MM/yyyy', { locale: es })})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Agregar Documento */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Agregar documento" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de entidad <span className="text-red-500">*</span>
            </label>
            <select
              value={form.entityType}
              onChange={(e) => handleFormChange('entityType', e.target.value as 'VEHICLE' | 'DRIVER')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="VEHICLE">Vehículo</option>
              <option value="DRIVER">Chofer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {form.entityType === 'VEHICLE' ? 'Vehículo' : 'Chofer'} <span className="text-red-500">*</span>
            </label>
            <select
              value={form.entityId}
              onChange={(e) => handleFormChange('entityId', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar...</option>
              {form.entityType === 'VEHICLE'
                ? vehicleList.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate} {v.brand ? `— ${v.brand} ${v.model ?? ''}` : ''}
                    </option>
                  ))
                : driverList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.user?.firstName ?? ''} {d.user?.lastName ?? ''} — {d.licenseNumber}
                    </option>
                  ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de documento <span className="text-red-500">*</span>
            </label>
            <select
              value={form.type}
              onChange={(e) => handleFormChange('type', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <Input
            label="URL del archivo"
            required
            placeholder="https://..."
            value={form.fileUrl}
            onChange={(e) => handleFormChange('fileUrl', e.target.value)}
          />

          <Input
            label="Fecha de vencimiento"
            type="date"
            value={form.expiresAt}
            onChange={(e) => handleFormChange('expiresAt', e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Guardar documento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
