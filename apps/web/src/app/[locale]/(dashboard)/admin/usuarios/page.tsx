'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, ShieldAlert, Pencil, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

type Role = 'ADMIN' | 'DADOR' | 'TRANSPORTISTA' | 'CHOFER';

const ROLE_COLORS: Record<Role, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  DADOR: 'bg-blue-100 text-blue-700',
  TRANSPORTISTA: 'bg-green-100 text-green-700',
  CHOFER: 'bg-yellow-100 text-yellow-700',
};

const ROLES: Role[] = ['ADMIN', 'DADOR', 'TRANSPORTISTA', 'CHOFER'];

export default function AdminUsuariosPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<Role>('DADOR');
  const [saving, setSaving] = useState(false);

  const { data, isLoading, isError } = useQuery<any[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data?.data ?? res.data ?? [];
    },
  });

  if (user && user.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-gray-800">Acceso denegado</h2>
      </div>
    );
  }

  const users: any[] = data ?? [];
  const filtered = roleFilter ? users.filter((u) => u.role === roleFilter) : users;

  const handleSaveRole = async (userId: string) => {
    setSaving(true);
    try {
      await api.patch(`/admin/users/${userId}`, { role: editRole });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingId(null);
    } catch {
      alert('Error al guardar rol.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u: any) => {
    try {
      await api.patch(`/users/${u.id}`, { isActive: !u.isActive });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch {
      alert('Error al cambiar estado.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-blue-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500">
            {isLoading ? 'Cargando…' : `${filtered.length} usuario${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <Card padding="sm">
        <div className="flex items-center gap-3 px-2 py-2 mb-4">
          <label className="text-sm text-gray-600 font-medium">Filtrar por rol:</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Todos</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse bg-gray-100 rounded" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-red-500 p-4">Error al cargar los usuarios.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 p-4">No se encontraron usuarios.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <span className="font-medium">
                      {u.firstName} {u.lastName}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-500">{u.email}</TableCell>
                  <TableCell>
                    {editingId === u.id ? (
                      <select
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as Role)}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          ROLE_COLORS[u.role as Role] ?? 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {u.company?.name ?? u.companyId ?? '—'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {editingId === u.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            loading={saving}
                            onClick={() => handleSaveRole(u.id)}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Guardar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(u.id);
                              setEditRole(u.role);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar rol
                          </Button>
                          <Button
                            size="sm"
                            variant={u.isActive ? 'danger' : 'secondary'}
                            onClick={() => handleToggleActive(u)}
                          >
                            {u.isActive ? 'Desactivar' : 'Activar'}
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
