'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Wifi, WifiOff, AlertTriangle, Truck, Navigation } from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useTracking, VehiclePositionWS } from '@/hooks/useTracking';
import { useAuth } from '@/hooks/useAuth';

const MapComponent = dynamic(() => import('./MapView'), { ssr: false });

export default function TrackingPage() {
  const { user } = useAuth();
  const companyId = (user as any)?.companyId;

  const { positions, connected, alerts, error } = useTracking({ companyId });
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  const positionsList = Object.values(positions);
  const selectedPos = selectedVehicle ? positions[selectedVehicle] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tracking en vivo</h1>
          <p className="text-sm text-gray-500 mt-1">
            {positionsList.length} vehículo(s) activo(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">{error}</span>
          )}
          <div className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border">
            {connected ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-green-500" />
                <span className="text-green-600 font-medium">En vivo</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-gray-500">Reconectando...</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <div className="lg:col-span-3">
          <Card padding="none" className="overflow-hidden rounded-xl border">
            <div className="h-[520px]">
              <MapComponent positions={positionsList} selectedVehicleId={selectedVehicle} />
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardTitle className="mb-3 text-sm flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-500" />
              Flota activa
            </CardTitle>
            {positionsList.length === 0 ? (
              <div className="text-center py-6">
                <MapPin className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">Sin vehículos en línea</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {positionsList.map((pos) => (
                  <li
                    key={pos.vehicleId}
                    onClick={() => setSelectedVehicle(pos.vehicleId === selectedVehicle ? null : pos.vehicleId)}
                    className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedVehicle === pos.vehicleId
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 shrink-0 animate-pulse" />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {pos.vehicleId.slice(0, 12)}...
                      </p>
                      <p className="text-xs text-gray-500">
                        {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {pos.speed !== undefined && pos.speed !== null && (
                          <span className="text-xs text-gray-400 flex items-center gap-0.5">
                            <Navigation className="h-3 w-3" />
                            {typeof pos.speed === 'number'
                              ? (pos.speed > 1 ? `${Math.round(pos.speed * 3.6)} km/h` : 'Detenido')
                              : '-'}
                          </span>
                        )}
                        <Badge variant={pos.connectionStatus === 'CONNECTED' ? 'success' : 'warning'} size="sm">
                          {pos.connectionStatus === 'CONNECTED' ? 'OK' : 'Sin señal'}
                        </Badge>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {selectedPos && (
            <Card>
              <CardTitle className="mb-2 text-sm">Detalle del vehículo</CardTitle>
              <div className="space-y-1 text-xs text-gray-600">
                <p><span className="font-medium">Lat:</span> {selectedPos.lat.toFixed(6)}</p>
                <p><span className="font-medium">Lng:</span> {selectedPos.lng.toFixed(6)}</p>
                {selectedPos.speed !== undefined && (
                  <p><span className="font-medium">Velocidad:</span> {Math.round((selectedPos.speed || 0) * 3.6)} km/h</p>
                )}
                {selectedPos.heading !== undefined && (
                  <p><span className="font-medium">Rumbo:</span> {Math.round(selectedPos.heading || 0)}°</p>
                )}
                <p><span className="font-medium">Última actualización:</span>{' '}
                  {new Date(selectedPos.timestamp).toLocaleTimeString('es-AR')}
                </p>
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
    </div>
  );
}
