'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ShieldAlert, Building2, Pencil, Check, X } from 'lucide-react';
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

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free',
  PRO: 'Pro',
  EMPRESA: 'Empresa',
  FLOTA: 'Flota',
};

export default function AdminEmpresasPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const { data, isLoading, isError } = useQuery<any[]>({
    queryKey: ['admin-companies'],
    queryFn: async () => {
      const res = await api.get('/admin/companies');
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

  const companies: any[] = data ?? [];
  const filtered = companies.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleEdit = (company: any) => {
    setEditingId(company.id);
    setEditForm({ name: company.name, cuit: company.cuit, planType: company.planType });
  };

  const handleSave = async (company: any) => {
    setSaving(true);
    try {
      await api.patch(`/admin/companies/${company.id}`, editForm);
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      setEditingId(null);
    } catch {
      alert('Error al guardar cambios.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (company: any) => {
    try {
      await api.patch(`/admin/companies/${company.id}`, { isActive: !company.isActive });
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
    } catch {
      alert('Error al cambiar estado.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-blue-700" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
            <p className="text-sm text-gray-500">
              {isLoading ? 'Cargando…' : `${filtered.length} empresa${filtered.length !== 1 ? 's' : ''} encontrada${filtered.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      <Card padding="sm">
        <div className="flex items-center gap-2 px-2 py-1 mb-4">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse bg-gray-100 rounded" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-red-500 p-4">Error al cargar las empresas.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 p-4">No se encontraron empresas.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>CUIT</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    {editingId === company.id ? (
                      <input
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    ) : (
                      <span className="font-medium">{company.name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === company.id ? (
                      <input
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                        value={editForm.cuit}
                        onChange={(e) => setEditForm({ ...editForm, cuit: e.target.value })}
                      />
                    ) : (
                      company.cuit ?? '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === company.id ? (
                      <select
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                        value={editForm.planType}
                        onChange={(e) => setEditForm({ ...editForm, planType: e.target.value })}
                      >
                        {Object.keys(PLAN_LABELS).map((p) => (
                          <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {PLAN_LABELS[company.planType] ?? company.planType}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{company.country ?? '—'}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        company.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {company.isActive ? 'Activa' : 'Suspendida'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {editingId === company.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            loading={saving}
                            onClick={() => handleSave(company)}
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
                            onClick={() => handleEdit(company)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant={company.isActive ? 'danger' : 'secondary'}
                            onClick={() => handleToggleActive(company)}
                          >
                            {company.isActive ? 'Suspender' : 'Activar'}
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
