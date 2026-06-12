'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Users, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import KpiCard from '@/components/ui/KpiCard';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { format, isPast } from 'date-fns';
import { es } from 'date-fns/locale';

const createDriverSchema = z.object({
  firstName: z.string().min(1, 'Requerido'),
  lastName: z.string().min(1, 'Requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  licenseNumber: z.string().min(1, 'Requerido'),
  licenseExpiry: z.string().min(1, 'Requerido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

const updateDriverSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.string().optional(),
});

type CreateDriverFormData = z.infer<typeof createDriverSchema>;
type UpdateDriverFormData = z.infer<typeof updateDriverSchema>;

export default function ChoferesPage() {
  const { user } = useAuth();
  const companyId = (user as any)?.companyId as string | undefined;
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<{ name: string; email: string; password: string } | null>(null);

  const queryParams = new URLSearchParams();
  if (companyId) queryParams.set('companyId', companyId);
  if (filterStatus) queryParams.set('status', filterStatus);
  if (search) queryParams.set('search', search);
  queryParams.set('page', String(page));
  queryParams.set('limit', '20');

  const { data, isLoading } = useQuery({
    queryKey: ['choferes', companyId, filterStatus, search, page],
    queryFn: async () => {
      const res = await api.get('/drivers?' + queryParams.toString());
      return res.data;
    },
    enabled: !!companyId,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['choferes-stats', companyId],
    queryFn: async () => {
      const res = await api.get('/drivers/stats?companyId=' + companyId);
      return res.data;
    },
    enabled: !!companyId,
  });

  const createForm = useForm<CreateDriverFormData>({
    resolver: zodResolver(createDriverSchema),
  });

  const editForm = useForm<UpdateDriverFormData>({
    resolver: zodResolver(updateDriverSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/drivers', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['choferes'] });
      queryClient.invalidateQueries({ queryKey: ['choferes-stats'] });
      setCreateModalOpen(false);
      if (res.data?.tempPassword) {
        setCreatedPassword({
          name: `${res.data.user.firstName} ${res.data.user.lastName}`,
          email: res.data.user.email,
          password: res.data.tempPassword,
        });
      }
      createForm.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch('/drivers/' + id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['choferes'] });
      setEditingDriver(null);
      editForm.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete('/drivers/' + id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['choferes'] });
      queryClient.invalidateQueries({ queryKey: ['choferes-stats'] });
      setDeleteConfirm(null);
    },
  });

  const onCreateSubmit = (formData: CreateDriverFormData) => {
    createMutation.mutate({ ...formData, companyId });
  };

  const onEditSubmit = (formData: UpdateDriverFormData) => {
    if (!editingDriver) return;
    const payload: any = {};
    if (formData.firstName) payload.firstName = formData.firstName;
    if (formData.lastName) payload.lastName = formData.lastName;
    if (formData.email) payload.email = formData.email;
    if (formData.phone !== undefined) payload.phone = formData.phone;
    if (formData.licenseNumber) payload.licenseNumber = formData.licenseNumber;
    if (formData.licenseExpiry) payload.licenseExpiry = formData.licenseExpiry;
    updateMutation.mutate({ id: editingDriver.id, data: payload });
  };

  const openEdit = (driver: any) => {
    setEditingDriver(driver);
    const expiry = driver.licenseExpiry ? new Date(driver.licenseExpiry).toISOString().split('T')[0] : '';
    editForm.reset({
      firstName: driver.user?.firstName || '',
      lastName: driver.user?.lastName || '',
      email: driver.user?.email || '',
      phone: driver.user?.phone || '',
      licenseNumber: driver.licenseNumber || '',
      licenseExpiry: expiry,
    });
  };

  const isLicenseExpired = (expiryDate: string) => isPast(new Date(expiryDate));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Choferes</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de conductores</p>
        </div>
        <Button onClick={() => { createForm.reset(); setCreateModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />
          Agregar chofer
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Total" value={stats?.total ?? '—'} icon={<Users className="h-5 w-5 text-gray-500" />} loading={statsLoading} />
        <KpiCard title="Activos" value={stats?.active ?? 0} loading={statsLoading} variant="success" />
        <KpiCard title="En viaje" value={stats?.onTrip ?? 0} loading={statsLoading} />
        <KpiCard
          title="Licencias vencidas"
          value={stats?.withExpiredLicense ?? 0}
          loading={statsLoading}
          variant={(stats?.withExpiredLicense ?? 0) > 0 ? 'danger' : 'default'}
          icon={(stats?.withExpiredLicense ?? 0) > 0 ? <AlertTriangle className="h-5 w-5 text-red-500" /> : undefined}
        />
      </div>

      <Card>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Buscar por nombre, email, nro. licencia..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 min-w-[200px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
            <option value="VENCIDO">Vencido</option>
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
                <TableHead>Vencimiento Licencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Viajes</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((driver: any) => {
                const expired = isLicenseExpired(driver.licenseExpiry);
                return (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">
                      {driver.user?.firstName} {driver.user?.lastName}
                    </TableCell>
                    <TableCell className="text-gray-500">{driver.user?.email}</TableCell>
                    <TableCell>{driver.user?.phone || '—'}</TableCell>
                    <TableCell className="font-mono">{driver.licenseNumber}</TableCell>
                    <TableCell>
                      <span className={expired ? 'text-red-600 font-medium' : ''}>
                        {format(new Date(driver.licenseExpiry), 'dd/MM/yyyy', { locale: es })}
                      </span>
                    </TableCell>
                    <TableCell><StatusBadge status={driver.status} /></TableCell>
                    <TableCell>{driver._count?.trips ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(driver)} className="text-gray-400 hover:text-blue-600 transition-colors" title="Editar">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(driver.id)} className="text-gray-400 hover:text-red-600 transition-colors" title="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
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
        isOpen={createModalOpen}
        onClose={() => { setCreateModalOpen(false); createForm.reset(); }}
        title="Agregar chofer"
        size="lg"
      >
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
          {createMutation.error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {(createMutation.error as any)?.response?.data?.message || 'Error al guardar'}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre *"
              {...createForm.register('firstName')}
              error={createForm.formState.errors.firstName?.message}
            />
            <Input
              label="Apellido *"
              {...createForm.register('lastName')}
              error={createForm.formState.errors.lastName?.message}
            />
          </div>
          <Input
            label="Email *"
            type="email"
            {...createForm.register('email')}
            error={createForm.formState.errors.email?.message}
          />
          <Input
            label="Teléfono"
            {...createForm.register('phone')}
            error={createForm.formState.errors.phone?.message}
          />
          <Input
            label="Número de licencia *"
            {...createForm.register('licenseNumber')}
            error={createForm.formState.errors.licenseNumber?.message}
          />
          <Input
            label="Vencimiento de licencia *"
            type="date"
            {...createForm.register('licenseExpiry')}
            error={createForm.formState.errors.licenseExpiry?.message}
          />
          <Input
            label="Contraseña de acceso a la app *"
            type="text"
            placeholder="Mínimo 6 caracteres"
            {...createForm.register('password')}
            error={createForm.formState.errors.password?.message}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setCreateModalOpen(false); createForm.reset(); }}>Cancelar</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!editingDriver}
        onClose={() => { setEditingDriver(null); editForm.reset(); }}
        title="Editar chofer"
        size="lg"
      >
        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
          {updateMutation.error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {(updateMutation.error as any)?.response?.data?.message || 'Error al guardar'}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre"
              {...editForm.register('firstName')}
              error={editForm.formState.errors.firstName?.message}
            />
            <Input
              label="Apellido"
              {...editForm.register('lastName')}
              error={editForm.formState.errors.lastName?.message}
            />
          </div>
          <Input
            label="Email"
            type="email"
            {...editForm.register('email')}
            error={editForm.formState.errors.email?.message}
          />
          <Input
            label="Teléfono"
            {...editForm.register('phone')}
            error={editForm.formState.errors.phone?.message}
          />
          <Input
            label="Número de licencia"
            {...editForm.register('licenseNumber')}
            error={editForm.formState.errors.licenseNumber?.message}
          />
          <Input
            label="Vencimiento de licencia"
            type="date"
            {...editForm.register('licenseExpiry')}
            error={editForm.formState.errors.licenseExpiry?.message}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setEditingDriver(null); editForm.reset(); }}>Cancelar</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Eliminar chofer"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">¿Estás seguro de que querés eliminar este chofer? Esta acción no se puede deshacer.</p>
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

      <Modal
        isOpen={!!createdPassword}
        onClose={() => setCreatedPassword(null)}
        title="✅ Chofer creado"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            El chofer <strong>{createdPassword?.name}</strong> fue creado correctamente.
            Compartí estas credenciales para que pueda ingresar a la app:
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">EMAIL</span>
              <span className="text-sm font-mono font-bold">{createdPassword?.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">CONTRASEÑA</span>
              <span className="text-sm font-mono font-bold text-blue-700">{createdPassword?.password}</span>
            </div>
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            ⚠️ Guardá esta contraseña. No se mostrará nuevamente.
          </p>
          <Button className="w-full" onClick={() => setCreatedPassword(null)}>Entendido</Button>
        </div>
      </Modal>
    </div>
  );
}
