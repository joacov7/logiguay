'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Search, Wifi, WifiOff, ShieldAlert, Save, Smartphone, Satellite, Copy } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
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

// IP pública del servidor Traccar (a donde reportan los equipos GPS)
const GPS_SERVER_IP = '46.62.197.160';

// Cada protocolo escucha en un puerto distinto en Traccar
const PROTOCOL_PORTS: Record<string, number> = {
  CONCOX: 5023,
  GT06: 5024,
};

const PROTOCOL_OPTIONS = [
  { value: 'CONCOX', label: 'Concox (West A10 y similares)' },
  { value: 'GT06', label: 'GT06' },
];

interface VehicleRow {
  id: string;
  plate: string;
  type: string;
  brand?: string;
  model?: string;
  company?: { name: string };
  trackingMode?: 'APP' | 'GPS_FISICO';
  trackerDeviceId?: string | null;
  trackerProtocol?: 'CONCOX' | 'GT06' | null;
}

export default function AdminVehiculosPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterGps, setFilterGps] = useState<'all' | 'with' | 'without'>('all');
  const [editing, setEditing] = useState<VehicleRow | null>(null);

  // Draft state for the config modal
  const [mode, setMode] = useState<'APP' | 'GPS_FISICO'>('APP');
  const [imei, setImei] = useState('');
  const [protocol, setProtocol] = useState<'CONCOX' | 'GT06'>('CONCOX');
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError } = useQuery<VehicleRow[]>({
    queryKey: ['admin-vehicles'],
    queryFn: async () => {
      const res = await api.get('/vehicles/admin/all');
      return res.data ?? [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      trackingMode: string;
      trackerDeviceId: string | null;
      trackerProtocol: string | null;
    }) =>
      api.patch(`/vehicles/admin/${payload.id}/tracking`, {
        trackingMode: payload.trackingMode,
        trackerDeviceId: payload.trackerDeviceId,
        trackerProtocol: payload.trackerProtocol,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vehicles'] });
      setEditing(null);
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

  const vehicles: VehicleRow[] = data ?? [];

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

  const openConfig = (v: VehicleRow) => {
    setEditing(v);
    setMode(v.trackingMode ?? (v.trackerDeviceId ? 'GPS_FISICO' : 'APP'));
    setImei(v.trackerDeviceId ?? '');
    setProtocol((v.trackerProtocol as 'CONCOX' | 'GT06') ?? 'CONCOX');
    setCopied(false);
  };

  const handleSave = () => {
    if (!editing) return;
    const isPhysical = mode === 'GPS_FISICO';
    updateMutation.mutate({
      id: editing.id,
      trackingMode: mode,
      trackerDeviceId: isPhysical ? imei.trim() || null : null,
      trackerProtocol: isPhysical ? protocol : null,
    });
  };

  const port = PROTOCOL_PORTS[protocol];
  const deviceCommand = `SERVER,0,${GPS_SERVER_IP},${port},0#`;

  const copyCommand = () => {
    navigator.clipboard?.writeText(deviceCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const withGps = vehicles.filter((v) => !!v.trackerDeviceId).length;
  const withoutGps = vehicles.length - withGps;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Truck className="h-6 w-6 text-blue-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehículos & GPS</h1>
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
                <TableHead>Seguimiento</TableHead>
                <TableHead>IMEI / Protocolo</TableHead>
                <TableHead>Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => {
                const isPhysical = (v.trackingMode ?? (v.trackerDeviceId ? 'GPS_FISICO' : 'APP')) === 'GPS_FISICO';
                return (
                  <TableRow key={v.id}>
                    <TableCell className="text-sm text-gray-600">{v.company?.name ?? '—'}</TableCell>
                    <TableCell className="font-mono font-semibold">{v.plate}</TableCell>
                    <TableCell>
                      <Badge variant="info">{v.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {isPhysical ? (
                        <span className="inline-flex items-center gap-1 text-sm text-green-700">
                          <Satellite className="h-3.5 w-3.5" /> GPS físico
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                          <Smartphone className="h-3.5 w-3.5" /> App del chofer
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {v.trackerDeviceId ? (
                        <div className="text-sm">
                          <span className="font-mono text-gray-700">{v.trackerDeviceId}</span>
                          {v.trackerProtocol && (
                            <Badge variant="default" className="ml-2">{v.trackerProtocol}</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300 italic text-sm">sin asignar</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openConfig(v)}>
                        Configurar GPS
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Config modal */}
      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Configurar seguimiento — ${editing.plate}` : ''}
        size="lg"
      >
        <div className="space-y-5">
          {/* Tracking mode toggle */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Fuente de seguimiento</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('APP')}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                  mode === 'APP' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Smartphone className={`h-5 w-5 ${mode === 'APP' ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">App del chofer</div>
                  <div className="text-xs text-gray-500">Sin hardware, durante el viaje</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode('GPS_FISICO')}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                  mode === 'GPS_FISICO' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Satellite className={`h-5 w-5 ${mode === 'GPS_FISICO' ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">GPS físico</div>
                  <div className="text-xs text-gray-500">Equipo instalado (Traccar)</div>
                </div>
              </button>
            </div>
          </div>

          {/* Physical GPS config */}
          {mode === 'GPS_FISICO' && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">IMEI del equipo</label>
                <input
                  type="text"
                  value={imei}
                  onChange={(e) => setImei(e.target.value)}
                  placeholder="15 dígitos (ej: 861768070650148)"
                  maxLength={20}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Protocolo</label>
                <select
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value as 'CONCOX' | 'GT06')}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PROTOCOL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Device config helper */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">Configuración del dispositivo</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                  <div>Servidor: <span className="font-mono text-gray-900">{GPS_SERVER_IP}</span></div>
                  <div>Puerto: <span className="font-mono text-gray-900">{port}</span></div>
                </div>
                <p className="text-xs text-gray-500 mb-1">Comando a enviar por SMS al equipo:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-gray-200 rounded px-2 py-1.5 text-xs font-mono text-gray-800 overflow-x-auto">
                    {deviceCommand}
                  </code>
                  <button
                    type="button"
                    onClick={copyCommand}
                    className="shrink-0 p-1.5 rounded hover:bg-gray-200 text-gray-500"
                    title="Copiar"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                {copied && <p className="text-xs text-green-600 mt-1">¡Copiado!</p>}
              </div>
            </>
          )}

          {updateMutation.isError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {(updateMutation.error as any)?.response?.data?.message || 'Error al guardar'}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={handleSave} loading={updateMutation.isPending}>
              <Save className="h-4 w-4 mr-1" />
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
