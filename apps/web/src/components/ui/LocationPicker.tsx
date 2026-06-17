'use client';

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Centro por defecto: aprox. centro de Argentina (Pampa húmeda)
const DEFAULT_CENTER: [number, number] = [-33.0, -61.0];
const DEFAULT_ZOOM = 6;
const PINNED_ZOOM = 14;

const pinIcon = new L.DivIcon({
  html: `<div style="width:28px;height:28px;background:#15A66A;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat?: number; lng?: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) {
      map.setView([lat, lng], Math.max(map.getZoom(), PINNED_ZOOM));
    }
  }, [lat, lng, map]);
  return null;
}

interface Props {
  lat?: number;
  lng?: number;
  onPick: (lat: number, lng: number, address?: string) => void;
}

export default function LocationPicker({ lat, lng, onPick }: Props) {
  const [loadingAddr, setLoadingAddr] = useState(false);

  const center: [number, number] = lat != null && lng != null ? [lat, lng] : DEFAULT_CENTER;
  const zoom = lat != null && lng != null ? PINNED_ZOOM : DEFAULT_ZOOM;

  async function reverseGeocode(la: number, ln: number) {
    setLoadingAddr(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${ln}&format=json&accept-language=es`,
        { headers: { 'Accept-Language': 'es' } },
      );
      const data = await res.json();
      return data?.display_name as string | undefined;
    } catch {
      return undefined;
    } finally {
      setLoadingAddr(false);
    }
  }

  async function handlePick(la: number, ln: number) {
    const rounded = (n: number) => Math.round(n * 1e6) / 1e6;
    const address = await reverseGeocode(la, ln);
    onPick(rounded(la), rounded(ln), address);
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg overflow-hidden border border-gray-300" style={{ height: 280 }}>
        <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={handlePick} />
          <Recenter lat={lat} lng={lng} />
          {lat != null && lng != null && (
            <Marker
              position={[lat, lng]}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend(e) {
                  const m = e.target as L.Marker;
                  const pos = m.getLatLng();
                  handlePick(pos.lat, pos.lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <p className="text-xs text-gray-500">
        {loadingAddr
          ? 'Buscando dirección del punto…'
          : 'Tocá el mapa para marcar el punto, o arrastrá el pin para ajustarlo. Ideal para campos o lugares sin dirección.'}
        {lat != null && lng != null && (
          <span className="block text-gray-400 mt-0.5">
            Coordenadas: {lat.toFixed(6)}, {lng.toFixed(6)}
          </span>
        )}
      </p>
    </div>
  );
}
