'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Wifi, WifiOff } from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/Card';
import { useTracking } from '@/hooks/useTracking';
import { VehiclePosition } from '@/types';

const COMPANY_ID = 'placeholder';

const MapComponent = dynamic(() => import('./MapView'), { ssr: false });

export default function TrackingPage() {
  const { positions, connected, alerts } = useTracking(COMPANY_ID);
  const [positionsList, setPositionsList] = useState<Array<VehiclePosition & { vehicleId: string }>>([]);

  useEffect(() => {
    const list = Array.from(positions.entries()).map(([vehicleId, pos]) => ({
      ...pos,
      vehicleId,
    }));
    setPositionsList(list);
  }, [positions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tracking en vivo</h1>
          <p className="text-sm text-gray-500 mt-1">Posiciones en tiempo real de tu flota</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {connected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-green-600 font-medium">Conectado</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-400" />
              <span className="text-red-500 font-medium">Desconectado</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card padding="none" className="overflow-hidden">
            <div className="h-[500px] bg-gray-100 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Mapa de tracking</p>
                <p className="text-sm mt-1">
                  {positionsList.length > 0
                    ? `${positionsList.length} vehículo(s) en línea`
                    : 'Sin vehículos activos'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardTitle className="mb-3 text-sm">Vehículos en línea</CardTitle>
            {positionsList.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>
            ) : (
              <ul className="space-y-2">
                {positionsList.map((pos) => (
                  <li key={pos.vehicleId} className="flex items-start gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">{pos.vehicleId.slice(0, 8)}...</p>
                      <p className="text-gray-500">
                        {pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}
                      </p>
                      {pos.speed !== null && pos.speed !== undefined && (
                        <p className="text-gray-400">{pos.speed} km/h</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {alerts.length > 0 && (
            <Card>
              <CardTitle className="mb-3 text-sm text-red-600">Alertas recientes</CardTitle>
              <ul className="space-y-2">
                {alerts.slice(0, 5).map((alert, i) => (
                  <li key={i} className="text-xs text-gray-600 border-l-2 border-red-300 pl-2">
                    {alert.message}
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
