'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Truck, Plus, Pencil, Trash2, ToggleLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import KpiCard from '@/components/ui/KpiCard';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

const vehicleSchema = z.object({
  type: z.enum(['CAMION', 'ACOPLADO', 'SEMIRREMOLQUE']),
  plate: z.string().min(1, 'Requerido'),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 1).optional().or(z.literal('')),
  capacityTons: z.coerce.number().min(0).optional().or(z.literal('')),
  capacityM3: z.coerce.number().min(0).optional().or(z.literal('')),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

const statusSchema = z.object({
  status: z.enum(['ACTIVO', 'INACTIVO', 'MANTENIMIENTO']),
});
type StatusFormData = z.infer<typeof statusSchema>;

const vehicleTypeLabel: Record<string, string> = {
  CAMION: 'Camión',
  ACOPLADO: 'Acoplado',
  SEMIRREMOLQUE: 'Semirremolque',
};

const vehicleTypeVariant: Record<string, 'info' | 'default' | 'secondary'> = {
  CAMION: 'info',
  ACOPLADO: 'default',
  SEMIRREMOLQUE: 'secondary',
};

export default function FlotaPage() {
  const { user } = useAuth();
  const companyId = (user as any)?.companyId as string | undefined;
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusVehicle, setStatusVehicle] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  if (companyId) queryParams.set('companyId', companyId);
  if (filterType) queryParams.set('type', filterType);
  if (filterStatus) queryParams.set('status', filterStatus);
  if (search) queryParams.set('search', search);
  queryParams.set('page', String(page));
  queryParams.set('limit', '20');

  const { data, isLoading } = useQuery({
    queryKey: ['flota', companyId, filterType, filterStatus, search, page],
    queryFn: async () => {
      const res = await api.get('/vehicles?' + queryParams.toString());
      return res.data;
    },
    enabled: !!companyId,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['flota-stats', companyId],
    queryFn: async () => {
      const res = await api.get('/vehicles/stats?companyId=' + companyId);
      return res.data;
    },
    enabled: !!companyId,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { type: 'CAMION' },
  });

  const {
    register: registerStatus,
    handleSubmit: handleSubmitStatus,
    reset: resetStatus,
  } = useForm<StatusFormData>({
    resolver: zodResolver(statusSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/vehicles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flota'] });
      queryClient.invalidateQueries({ queryKey: ['flota-stats'] });
      setModalOpen(false);
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch('/vehicles/' + id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flota'] });
      setModalOpen(false);
      setEditingVehicle(null);
      reset();
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch('/vehicles/' + id + '/status', { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flota'] });
      queryClient.invalidateQueries({ queryKey: ['flota-stats'] });
      setStatusModalOpen(false);
      setStatusVehicle(null);
      resetStatus();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete('/vehicles/' + id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flota'] });
      queryClient.invalidateQueries({ queryKey: ['flota-stats'] });
      setDeleteConfirm(null);
    },
  });

  const onSubmit = (formData: VehicleFormData) => {
    const payload: any = {
      ...formData,
      companyId,
      plate: formData.plate.toUpperCase(),
      year: formData.year === '' ? undefined : formData.year,
      capacityTons: formData.capacityTons === '' ? undefined : formData.capacityTons,
      capacityM3: formData.capacityM3 === '' ? undefined : formData.capacityM3,
    };
    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const onStatusSubmit = (formData: StatusFormData) => {
    if (!statusVehicle) return;
    statusMutation.mutate({ id: statusVehicle.id, status: formData.status });
  };

  const openEdit = (vehicle: any) => {
    setEditingVehicle(vehicle);
    reset({
      type: vehicle.type,
      plate: vehicle.plate,
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      year: vehicle.year || '',
      capacityTons: vehicle.capacityTons || '',
      capacityM3: vehicle.capacityM3 || '',
    });
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditingVehicle(null);
    reset({ type: 'CAMION', plate: '', brand: '', model: '', year: '', capacityTons: '', capacityM3: '' });
    setModalOpen(true);
  };

  const openStatusModal = (vehicle: any) => {
    setStatusVehicle(vehicle);
    resetStatus({ status: vehicle.status });
    setStatusModalOpen(true);
  };

  const mutationError = createMutation.error || updateMutation.error;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flota</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de vehículos</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Agregar vehículo
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Total" value={stats?.total ?? '—'} icon={<Truck className="h-5 w-5 text-gray-500" />} loading={statsLoading} />
        <KpiCard title="Activos" value={stats?.byStatus?.ACTIVO ?? 0} loading={statsLoading} variant="success" />
        <KpiCard title="En viaje" value={stats?.onTrip ?? 0} loading={statsLoading} />
        <KpiCard title="Mantenimiento" value={stats?.byStatus?.MANTENIMIENTO ?? 0} loading={statsLoading} variant="warning" />
      </div>

      <Card>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Buscar por patente, marca, modelo..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 min-w-[200px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los tipos</option>
            <option value="CAMION">Camión</option>
            <option value="ACOPLADO">Acoplado</option>
            <option value="SEMIRREMOLQUE">Semirremolque</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
            <option value="MANTENIMIENTO">Mantenimiento</option>
          </select>
        </div>
      </Card>

      <Card padding="none">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : !data?.data?.length ? (
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
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-medium">{v.plate}</TableCell>
                  <TableCell>
                    <Badge variant={vehicleTypeVariant[v.type] || 'default'}>
                      {vehicleTypeLabel[v.type] || v.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{[v.brand, v.model].filter(Boolean).join(' ') || '—'}</TableCell>
                  <TableCell>{v.year || '—'}</TableCell>
                  <TableCell>
                    {v.capacityTons ? v.capacityTons + 't' : ''}
                    {v.capacityTons && v.capacityM3 ? ' / ' : ''}
                    {v.capacityM3 ? v.capacityM3 + 'm³' : ''}
                    {!v.capacityTons && !v.capacityM3 ? '—' : ''}
                  </TableCell>
                  <TableCell><StatusBadge status={v.status} /></TableCell>
                  <TableCell>{v._count?.trips ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(v)} className="text-gray-400 hover:text-blue-600 transition-colors" title="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => openStatusModal(v)} className="text-gray-400 hover:text-yellow-600 transition-colors" title="Cambiar estado">
                        <ToggleLeft className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteConfirm(v.id)} className="text-gray-400 hover:text-red-600 transition-colors" title="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
          <span className="text-sm text-gray-500">Página {page} de {data.pages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.pages}>Siguiente</Button>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingVehicle(null); reset(); }}
        title={editingVehicle ? 'Editar vehículo' : 'Agregar vehículo'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {mutationError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {(mutationError as any)?.response?.data?.message || 'Error al guardar'}
            </p>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700">Tipo *</label>
            <select
              {...register('type')}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="CAMION">Camión</option>
              <option value="ACOPLADO">Acoplado</option>
              <option value="SEMIRREMOLQUE">Semirremolque</option>
            </select>
            {errors.type && <p className="text-xs text-red-600 mt-1">{errors.type.message}</p>}
          </div>
          <Input label="Patente *" {...register('plate')} error={errors.plate?.message} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Marca" {...register('brand')} error={errors.brand?.message} />
            <Input label="Modelo" {...register('model')} error={errors.model?.message} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Año" type="number" {...register('year')} error={(errors.year as any)?.message} />
            <Input label="Capacidad (t)" type="number" step="0.1" {...register('capacityTons')} error={(errors.capacityTons as any)?.message} />
            <Input label="Capacidad (m³)" type="number" step="0.1" {...register('capacityM3')} error={(errors.capacityM3 as any)?.message} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setModalOpen(false); setEditingVehicle(null); reset(); }}>Cancelar</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={statusModalOpen}
        onClose={() => { setStatusModalOpen(false); setStatusVehicle(null); resetStatus(); }}
        title="Cambiar estado"
        size="sm"
      >
        <form onSubmit={handleSubmitStatus(onStatusSubmit)} className="space-y-4">
          {statusMutation.error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {(statusMutation.error as any)?.response?.data?.message || 'Error al cambiar estado'}
            </p>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700">Estado</label>
            <select
              {...registerStatus('status')}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
              <option value="MANTENIMIENTO">Mantenimiento</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { setStatusModalOpen(false); setStatusVehicle(null); }}>Cancelar</Button>
            <Button type="submit" disabled={statusMutation.isPending}>
              {statusMutation.isPending ? 'Guardando...' : 'Confirmar'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Eliminar vehículo"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">¿Estás seguro de que querés eliminar este vehículo? Esta acción no se puede deshacer.</p>
          {deleteMutation.error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {(deleteMutation.error as any)?.response?.data?.message || 'Error al eliminar'}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
