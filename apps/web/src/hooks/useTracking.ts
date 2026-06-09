'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface VehiclePositionWS {
  vehicleId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  timestamp: string;
  connectionStatus: string;
}

export interface TripStatusUpdate {
  tripId: string;
  status: string;
}

interface UseTrackingOptions {
  vehicleIds?: string[];
  companyId?: string;
  tripId?: string;
  onPosition?: (pos: VehiclePositionWS) => void;
  onTripStatus?: (update: TripStatusUpdate) => void;
  onAlert?: (alert: any) => void;
}

export function useTracking(options: UseTrackingOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [positions, setPositions] = useState<Record<string, VehiclePositionWS>>({});
  const [alerts, setAlerts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(`${API_URL}/tracking`, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
      const { vehicleIds, companyId, tripId } = optionsRef.current;
      vehicleIds?.forEach((id) => socket.emit('subscribe-vehicle', id));
      if (companyId) socket.emit('subscribe-company', companyId);
      if (tripId) socket.emit('subscribe-trip', tripId);
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => setError(err.message));

    socket.on('position', (pos: VehiclePositionWS) => {
      setPositions((prev) => ({ ...prev, [pos.vehicleId]: pos }));
      optionsRef.current.onPosition?.(pos);
    });

    socket.on('vehicle-position', (pos: VehiclePositionWS) => {
      setPositions((prev) => ({ ...prev, [pos.vehicleId]: pos }));
      optionsRef.current.onPosition?.(pos);
    });

    socket.on('trip-status', (update: TripStatusUpdate) => {
      optionsRef.current.onTripStatus?.(update);
    });

    socket.on('alert', (alert: any) => {
      setAlerts((prev) => [alert, ...prev.slice(0, 49)]);
      optionsRef.current.onAlert?.(alert);
    });

    return () => {
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subscribeVehicle = useCallback((vehicleId: string) => {
    socketRef.current?.emit('subscribe-vehicle', vehicleId);
  }, []);

  const unsubscribeVehicle = useCallback((vehicleId: string) => {
    socketRef.current?.emit('unsubscribe-vehicle', vehicleId);
  }, []);

  const sendPosition = useCallback(
    (payload: { vehicleId: string; lat: number; lng: number; speed?: number; heading?: number }) => {
      socketRef.current?.emit('position-update', payload);
    },
    [],
  );

  return { connected, positions, alerts, error, subscribeVehicle, unsubscribeVehicle, sendPosition };
}
