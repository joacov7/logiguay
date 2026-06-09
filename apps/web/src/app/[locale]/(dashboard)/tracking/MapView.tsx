'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VehiclePositionWS } from '@/hooks/useTracking';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const truckIcon = new L.DivIcon({
  html: `<div style="width:34px;height:34px;background:#2563eb;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;">🚛</div>`,
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -20],
});

const selectedTruckIcon = new L.DivIcon({
  html: `<div style="width:40px;height:40px;background:#dc2626;border-radius:50%;border:3px solid white;box-shadow:0 2px 12px rgba(220,38,38,0.5);display:flex;align-items:center;justify-content:center;font-size:18px;">🚛</div>`,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -24],
});

const originIcon = new L.DivIcon({
  html: `<div style="width:14px;height:14px;background:#16a34a;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const destIcon = new L.DivIcon({
  html: `<div style="width:14px;height:14px;background:#dc2626;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export interface ActiveTrip {
  id: string;
  plate?: string;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  originAddress?: string;
  destinationAddress?: string;
  status: string;
  type?: string;
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) { map.setView(points[0], 12, { animate: true }); return; }
    map.fitBounds(L.latLngBounds(points), { padding: [60, 60], animate: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.length]);
  return null;
}

interface MapViewProps {
  positions: VehiclePositionWS[];
  selectedVehicleId?: string | null;
  activeTrips?: ActiveTrip[];
}

export default function MapView({ positions, selectedVehicleId, activeTrips = [] }: MapViewProps) {
  const allPoints: [number, number][] = [
    ...positions.map((p) => [p.lat, p.lng] as [number, number]),
    ...activeTrips.flatMap((t) => {
      const pts: [number, number][] = [];
      if (t.originLat && t.originLng) pts.push([t.originLat, t.originLng]);
      if (t.destinationLat && t.destinationLng) pts.push([t.destinationLat, t.destinationLng]);
      return pts;
    }),
  ];

  const center: [number, number] = allPoints.length > 0 ? allPoints[0] : [-34.6037, -58.3816];

  return (
    <MapContainer center={center} zoom={allPoints.length === 0 ? 5 : 10} style={{ height: '100%', width: '100%' }} className="z-0">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <FitBounds points={allPoints} />

      {/* Live GPS positions */}
      {positions.map((pos) => (
        <Marker key={pos.vehicleId} position={[pos.lat, pos.lng]}
          icon={selectedVehicleId === pos.vehicleId ? selectedTruckIcon : truckIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold mb-1">🚛 Vehículo en vivo</p>
              <p>{pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</p>
              {pos.speed !== undefined && <p>Velocidad: {Math.round((pos.speed || 0) * 3.6)} km/h</p>}
              <p className="text-gray-400 text-xs mt-1">{new Date(pos.timestamp).toLocaleTimeString('es-AR')}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Active trips — show route between origin and destination */}
      {activeTrips.map((trip) => {
        const hasOrigin = trip.originLat && trip.originLng;
        const hasDest = trip.destinationLat && trip.destinationLng;
        const hasRoute = hasOrigin && hasDest;
        return (
          <React.Fragment key={trip.id}>
            {hasRoute && (
              <Polyline
                positions={[[trip.originLat!, trip.originLng!], [trip.destinationLat!, trip.destinationLng!]]}
                pathOptions={{ color: '#2563eb', weight: 3, dashArray: '8 6', opacity: 0.7 }}
              />
            )}
            {hasOrigin && (
              <Marker position={[trip.originLat!, trip.originLng!]} icon={originIcon}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold text-green-700">📍 Origen</p>
                    <p>{trip.originAddress || 'Sin dirección'}</p>
                    {trip.plate && <p className="text-gray-500 mt-1">Camión: {trip.plate}</p>}
                    <p className="text-gray-400 text-xs mt-1">Viaje: {trip.type}</p>
                  </div>
                </Popup>
              </Marker>
            )}
            {hasDest && (
              <Marker position={[trip.destinationLat!, trip.destinationLng!]} icon={destIcon}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold text-red-700">🏁 Destino</p>
                    <p>{trip.destinationAddress || 'Sin dirección'}</p>
                    {trip.plate && <p className="text-gray-500 mt-1">Camión: {trip.plate}</p>}
                  </div>
                </Popup>
              </Marker>
            )}
            {/* Show truck at origin if in transit */}
            {hasOrigin && !positions.find(p => p.vehicleId) && trip.status !== 'FINALIZADO' && (
              <Marker position={[trip.originLat!, trip.originLng!]} icon={truckIcon}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">🚛 {trip.plate || 'Camión'}</p>
                    <p className="text-gray-500">{trip.type}</p>
                    <p className="text-xs text-blue-600 mt-1">Estado: {trip.status.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-400">Sin GPS en tiempo real</p>
                  </div>
                </Popup>
              </Marker>
            )}
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
}
