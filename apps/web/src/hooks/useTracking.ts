'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { VehiclePosition } from '../types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

interface FleetPosition {
  vehicleId: string;
  position: VehiclePosition;
}

export function useTracking(companyId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const [positions, setPositions] = useState<Map<string, VehiclePosition>>(new Map());
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    socketRef.current = io(`${WS_URL}/tracking`, {
      auth: {
        token: typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null,
      },
      transports: ['websocket', 'polling'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setConnected(true);
      if (companyId) {
        socket.emit('subscribe-company', companyId);
      }
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('vehicle-position', (data: FleetPosition) => {
      setPositions((prev) => {
        const next = new Map(prev);
        next.set(data.vehicleId, data.position);
        return next;
      });
    });

    socket.on('position', (data: VehiclePosition) => {
      setPositions((prev) => {
        const next = new Map(prev);
        next.set(data.vehicleId, data);
        return next;
      });
    });

    socket.on('alert', (alert: any) => {
      setAlerts((prev) => [alert, ...prev.slice(0, 49)]);
    });

    return () => {
      socket.disconnect();
    };
  }, [companyId]);

  const subscribeVehicle = useCallback((vehicleId: string) => {
    socketRef.current?.emit('subscribe-vehicle', vehicleId);
  }, []);

  const unsubscribeVehicle = useCallback((vehicleId: string) => {
    socketRef.current?.emit('unsubscribe-vehicle', vehicleId);
  }, []);

  const sendPosition = useCallback((data: {
    vehicleId: string;
    lat: number;
    lng: number;
    speed?: number;
    heading?: number;
  }) => {
    socketRef.current?.emit('position-update', data);
  }, []);

  return {
    positions,
    connected,
    alerts,
    subscribeVehicle,
    unsubscribeVehicle,
    sendPosition,
  };
}
