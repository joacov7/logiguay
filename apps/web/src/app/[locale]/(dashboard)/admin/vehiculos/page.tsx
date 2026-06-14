'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Search, Wifi, WifiOff, ShieldAlert, Save, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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

export default function AdminVehiculosPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imeiDraft, setImeiDraft] = useState('');
  const [filterGps, setFilterGps] = useState<'all' | 'with' | 'without'>('all');

  const { data, isLoading, isError } = useQuery<any[]>({
    queryKey: ['admin-vehicles'],
    queryFn: async () => {
      const res = await api.get('/vehicles/admin/all');
      return res.data ?? [];
    },
  });

  const updateImeiMutation = useMutation({
    mutationFn: ({ id, trackerDeviceId }: { id: string; trackerDeviceId: string }) =>
      api.patch(`/vehicles/admin/${id}/imei`, { trackerDeviceId: trackerDeviceId || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vehicles'] });
      setEditingId(null);
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

  const vehicles: any[] = data ?? [];

  const filtered = vehicles.filter((v) => {
    const matchSearch =
      v.plate?.toLowerCase().includes(search.toLowerCase()) ||
      v.brand?.toLowerCase().includes(search.toLowerCase()) ||
      v.company?.name?.toLowerCase().includes(search.toLowerCase()) ||
      v.trackerDeviceId?.includes(search);
    const matchGps =
      filterGps === 'all' ||
      (filterGps === 'with' && !!v.trackerDeviceId) ||
      (filterGps === 'without' && !v.trackerDeviceId);
    return matchSearch && matchGps;
  });

  const startEdit = (v: any) => {
    setEditingId(v.id);
    setImeiDraft(v.trackerDeviceId ?? '');
  };

  const withGps = vehicles.filter((v) => !!v.trackerDeviceId).length;
  const withoutGps = vehicles.length - withGps;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Truck className="h-6 w-6 text-blue-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehículos</h1>
          <p className="text-sm text-gray-500">
            {isLoading ? 'Cargando…' : `${vehicles.length} vehículos — ${withGps} con GPS, ${withoutGps} sin GPS`}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card padding="sm">
          <div className="text-2xl font-bold text-gray-900">{vehicles.length}</div>
          <div className="text-sm text-gray-500">Total</div>
        </Card>
        <Card padding="sm">
          <div className="text-2xl font-bold text-green-600">{withGps}</div>
          <div className="text-sm text-gray-500 flex items-center gap-1"><Wifi className="h-3.5 w-3.5" /> Con GPS</div>
        </Card>
        <Card padding="sm">
          <div className="text-2xl font-bold text-gray-400">{withoutGps}</div>
          <div className="text-sm text-gray-500 flex items-center gap-1"><WifiOff className="h-3.5 w-3.5" /> Sin GPS</div>
        </Card>
      </div>

      <Card padding="sm">
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por patente, empresa, IMEI…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'with', 'without'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setFilterGps(opt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterGps === opt
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt === 'all' ? 'Todos' : opt === 'with' ? 'Con GPS' : 'Sin GPS'}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse bg-gray-100 rounded" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-red-500 p-4">Error al cargar los vehículos.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 p-4">No se encontraron vehículos.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Patente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Marca / Modelo</TableHead>
                <TableHead>GPS</TableHead>
                <TableHead>IMEI</TableHead>
                <TableHead>Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="text-sm text-gray-600">{v.company?.name ?? '—'}</TableCell>
                  <TableCell className="font-mono font-semibold">{v.plate}</TableCell>
                  <TableCell>
                    <Badge variant="info">{v.type}</Badge>
                  </TableCell>
                  <TableCell>{[v.brand, v.model].filter(Boolean).join(' ') || '—'}</TableCell>
                  <TableCell>
                    {v.trackerDeviceId ? (
                      <Wifi className="h-4 w-4 text-green-500" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-gray-300" />
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === v.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={imeiDraft}
                        onChange={(e) => setImeiDraft(e.target.value)}
                        placeholder="15 dígitos IMEI"
                        className="border border-blue-400 rounded px-2 py-1 text-sm w-44 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        maxLength={20}
                      />
                    ) : (
                      <span className="font-mono text-sm text-gray-700">
                        {v.trackerDeviceId ?? <span className="text-gray-300 italic">sin asignar</span>}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === v.id ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          loading={updateImeiMutation.isPending}
                          onClick={() => updateImeiMutation.mutate({ id: v.id, trackerDeviceId: imeiDraft })}
                        >
                          <Save className="h-3.5 w-3.5" />
                          Guardar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEdit(v)}>
                        Asignar IMEI
                      </Button>
                    )}
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
