'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VehiclePositionWS } from '@/hooks/useTracking';

// Fix default marker icons in webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const truckIcon = new L.DivIcon({
  html: `<div style="
    width:32px;height:32px;background:#2563eb;border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);border:3px solid white;
    box-shadow:0 2px 8px rgba(0,0,0,0.3);
    display:flex;align-items:center;justify-content:center;
  ">
    <span style="transform:rotate(45deg);font-size:14px;">🚛</span>
  </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const selectedIcon = new L.DivIcon({
  html: `<div style="
    width:38px;height:38px;background:#dc2626;border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);border:3px solid white;
    box-shadow:0 2px 12px rgba(220,38,38,0.5);
    display:flex;align-items:center;justify-content:center;
  ">
    <span style="transform:rotate(45deg);font-size:16px;">🚛</span>
  </div>`,
  className: '',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

function FitBounds({ positions }: { positions: VehiclePositionWS[] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView([positions[0].lat, positions[0].lng], 13, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(positions.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [50, 50], animate: true });
  }, [positions.length]);

  return null;
}

interface MapViewProps {
  positions: VehiclePositionWS[];
  selectedVehicleId?: string | null;
}

export default function MapView({ positions, selectedVehicleId }: MapViewProps) {
  const center: [number, number] =
    positions.length > 0
      ? [positions[0].lat, positions[0].lng]
      : [-34.6037, -58.3816]; // Buenos Aires default

  return (
    <MapContainer
      center={center}
      zoom={positions.length === 0 ? 5 : 13}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      <FitBounds positions={positions} />

      {positions.map((pos) => (
        <Marker
          key={pos.vehicleId}
          position={[pos.lat, pos.lng]}
          icon={selectedVehicleId === pos.vehicleId ? selectedIcon : truckIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold mb-1">ID: {pos.vehicleId.slice(0, 12)}...</p>
              <p>Lat: {pos.lat.toFixed(5)}</p>
              <p>Lng: {pos.lng.toFixed(5)}</p>
              {pos.speed !== undefined && (
                <p>Velocidad: {Math.round((pos.speed || 0) * 3.6)} km/h</p>
              )}
              <p className="text-gray-400 text-xs mt-1">
                {new Date(pos.timestamp).toLocaleTimeString('es-AR')}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
