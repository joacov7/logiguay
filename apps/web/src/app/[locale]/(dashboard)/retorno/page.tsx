'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Navigation, Package } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import { Cargo } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

interface CargoWithDist extends Cargo {
  distKm: number;
  company: { id: string; name: string; country: string };
}

const RADIUS_OPTIONS = [50, 100, 200, 300];

export default function RetornoPage() {
  const { user } = useAuth();
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [radiusKm, setRadiusKm] = useState(150);
  const [locLabel, setLocLabel] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);

  function useMyLocation() {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLatInput(pos.coords.latitude.toFixed(5));
        setLngInput(pos.coords.longitude.toFixed(5));
        setLocLabel('Mi ubicación actual');
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
    );
  }

  function applyManual() {
    const la = parseFloat(latInput);
    const lo = parseFloat(lngInput);
    if (!isNaN(la) && !isNaN(lo)) {
      setLat(la);
      setLng(lo);
      setLocLabel('Ubicación manual');
    }
  }

  const { data: activeTrips } = useQuery({
    queryKey: ['trips-driver', user?.id],
    queryFn: async () => {
      const res = await api.get('/trips', {
        params: { driverId: (user as any)?.driverId, status: 'EN_TRANSITO,ASIGNADO,EN_CAMINO_ORIGEN' },
      });
      return res.data?.data ?? [];
    },
    enabled: !!user && user.role === 'TRANSPORTISTA',
  });

  const { data: retorno, isLoading } = useQuery<CargoWithDist[]>({
    queryKey: ['retorno', lat, lng, radiusKm],
    queryFn: async () => {
      const res = await api.get('/cargo/retorno', { params: { lat, lng, radiusKm } });
      return res.data;
    },
    enabled: lat != null && lng != null,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bolsa de Retorno</h1>
        <p className="text-sm text-gray-500 mt-1">Encontrá cargas disponibles cerca de tu destino</p>
      </div>

      {/* Location input */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={useMyLocation} loading={geoLoading}>
              <Navigation className="h-4 w-4 mr-1" />
              Usar mi ubicación
            </Button>
            {locLabel && (
              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {locLabel}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Latitud"
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32"
            />
            <input
              type="text"
              placeholder="Longitud"
              value={lngInput}
              onChange={(e) => setLngInput(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32"
            />
            <Button size="sm" variant="outline" onClick={applyManual}>
              Aplicar
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Radio:</span>
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRadiusKm(r)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  radiusKm === r ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Active trips — use destination as reference */}
      {activeTrips && activeTrips.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Usar destino de viaje activo</h2>
          <div className="flex gap-3 flex-wrap">
            {activeTrips.map((trip: any) => (
              <button
                key={trip.id}
                onClick={() => {
                  const la = trip.cargo?.destinationLat;
                  const lo = trip.cargo?.destinationLng;
                  if (la && lo) {
                    setLat(la);
                    setLng(lo);
                    setLatInput(String(la));
                    setLngInput(String(lo));
                    setLocLabel(trip.cargo?.destinationAddress ?? 'Destino del viaje');
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <Navigation className="h-3 w-3 text-blue-500" />
                <span className="truncate max-w-xs">{trip.cargo?.destinationAddress ?? 'Viaje activo'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {lat == null ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <MapPin className="h-12 w-12 mb-3 opacity-50" />
          <p className="font-medium">Ingresá una ubicación para buscar cargas</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : !retorno?.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Package className="h-12 w-12 mb-3 opacity-50" />
          <p className="font-medium">No hay cargas disponibles en ese radio</p>
          <p className="text-sm mt-1">Probá aumentar el radio de búsqueda</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {retorno.map((cargo) => (
            <Card key={cargo.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{cargo.type}</span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                      {cargo.distKm.toFixed(0)} km
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {cargo.originAddress} → {cargo.destinationAddress}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    {cargo.weightTons != null && <span>{cargo.weightTons}t</span>}
                    {cargo.estimatedValue != null && (
                      <span>${cargo.estimatedValue.toLocaleString('es-AR')}</span>
                    )}
                    {cargo.requiredDate && (
                      <span>{format(new Date(cargo.requiredDate), 'dd MMM yyyy', { locale: es })}</span>
                    )}
                    <span className="text-gray-500">{cargo.company?.name}</span>
                  </div>
                </div>
                <Link href={`/bolsa`}>
                  <Button size="sm" variant="outline">
                    Ver detalles
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
