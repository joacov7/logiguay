'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Wifi, WifiOff, AlertTriangle, Truck, Navigation } from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useTracking } from '@/hooks/useTracking';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { ActiveTrip } from './MapView';

const MapComponent = dynamic(() => import('./MapView'), { ssr: false });

const ACTIVE_STATUSES = ['EN_CAMINO_ORIGEN', 'EN_CARGA', 'EN_TRANSITO', 'EN_DESCARGA'];

export default function TrackingPage() {
  const { user } = useAuth();

  // Traer todas las empresas del usuario para suscribirse a todas
  const { data: companiesData } = useQuery({
    queryKey: ['my-companies'],
    enabled: !!user,
    queryFn: () => api.get('/auth/me').then((r) => r.data),
  });
  const companyIds: string[] = companiesData?.companyIds ??
    ((user as any)?.companyId ? [(user as any).companyId] : []);

  const { positions, connected, alerts, error } = useTracking({ companyIds });
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  const { data: tripsData } = useQuery({
    queryKey: ['tracking-trips', companyIds.join(',')],
    enabled: companyIds.length > 0,
    refetchInterval: 30000,
    queryFn: async () => {
      const res = await api.get('/trips', { params: { limit: 50 } });
      return res.data;
    },
  });

  const activeTrips: ActiveTrip[] = (tripsData?.data ?? [])
    .filter((t: any) => ACTIVE_STATUSES.includes(t.status) || t.status === 'ASIGNADO')
    .map((t: any) => ({
      id: t.id,
      plate: t.vehicle?.plate,
      originLat: t.cargo?.originLat,
      originLng: t.cargo?.originLng,
      destinationLat: t.cargo?.destinationLat,
      destinationLng: t.cargo?.destinationLng,
      originAddress: t.cargo?.originAddress,
      destinationAddress: t.cargo?.destinationAddress,
      status: t.status,
      type: t.cargo?.type,
    }));

  const positionsList = Object.values(positions);
  const selectedPos = selectedVehicle ? positions[selectedVehicle] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tracking en vivo</h1>
          <p className="text-sm text-gray-500 mt-1">
            {positionsList.length > 0
              ? `${positionsList.length} vehículo(s) con GPS activo`
              : activeTrips.length > 0
              ? `${activeTrips.length} viaje(s) activo(s) — sin GPS en tiempo real`
              : 'Sin viajes activos'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">{error}</span>}
          <div className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border">
            {connected ? (
              <><Wifi className="h-3.5 w-3.5 text-green-500" /><span className="text-green-600 font-medium">En vivo</span></>
            ) : (
              <><WifiOff className="h-3.5 w-3.5 text-gray-400" /><span className="text-gray-500">Reconectando...</span></>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <div className="lg:col-span-3">
          <Card padding="none" className="overflow-hidden rounded-xl border">
            <div className="h-[520px]">
              <MapComponent
                positions={positionsList}
                selectedVehicleId={selectedVehicle}
                activeTrips={activeTrips}
              />
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Active trips list */}
          <Card>
            <CardTitle className="mb-3 text-sm flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-500" />
              Viajes activos ({activeTrips.length})
            </CardTitle>
            {activeTrips.length === 0 ? (
              <div className="text-center py-6">
                <MapPin className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">Sin viajes en curso</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {activeTrips.map((trip) => (
                  <li key={trip.id} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="text-base mt-0.5">🚛</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm">
                        {trip.plate ?? 'Sin patente'} — {trip.type ?? '—'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{trip.originAddress}</p>
                      <p className="text-xs text-gray-400 truncate">→ {trip.destinationAddress}</p>
                      <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {trip.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Live GPS vehicles */}
          {positionsList.length > 0 && (
            <Card>
              <CardTitle className="mb-3 text-sm flex items-center gap-2">
                <Navigation className="h-4 w-4 text-green-500" />
                GPS en tiempo real
              </CardTitle>
              <ul className="space-y-2">
                {positionsList.map((pos) => (
                  <li key={pos.vehicleId}
                    onClick={() => setSelectedVehicle(pos.vehicleId === selectedVehicle ? null : pos.vehicleId)}
                    className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedVehicle === pos.vehicleId ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}>
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 shrink-0 animate-pulse" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">{pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</p>
                      {pos.speed !== undefined && (
                        <p className="text-xs text-gray-400">
                          {(pos.speed || 0) > 1 ? `${Math.round((pos.speed || 0) * 3.6)} km/h` : 'Detenido'}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {selectedPos && (
            <Card>
              <CardTitle className="mb-2 text-sm">Detalle GPS</CardTitle>
              <div className="space-y-1 text-xs text-gray-600">
                <p><span className="font-medium">Lat:</span> {selectedPos.lat.toFixed(6)}</p>
                <p><span className="font-medium">Lng:</span> {selectedPos.lng.toFixed(6)}</p>
                {selectedPos.speed !== undefined && (
                  <p><span className="font-medium">Velocidad:</span> {Math.round((selectedPos.speed || 0) * 3.6)} km/h</p>
                )}
                <p><span className="font-medium">Última actualización:</span> {new Date(selectedPos.timestamp).toLocaleTimeString('es-AR')}</p>
              </div>
            </Card>
          )}

          {alerts.length > 0 && (
            <Card>
              <CardTitle className="mb-3 text-sm flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                Alertas ({alerts.length})
              </CardTitle>
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {alerts.slice(0, 10).map((alert, i) => (
                  <li key={i} className="text-xs text-gray-600 border-l-2 border-amber-400 pl-2 py-0.5">
                    <p className="font-medium text-amber-700">{alert.type}</p>
                    <p>{alert.message}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {activeTrips.length > 0 && positionsList.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 flex items-start gap-3">
          <MapPin className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Mapa de rutas activas</p>
            <p className="text-blue-600 mt-0.5">
              Se muestran las rutas planificadas (origen → destino) de los viajes en curso.
              El tracking GPS en tiempo real requiere que el chofer use la app móvil.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
