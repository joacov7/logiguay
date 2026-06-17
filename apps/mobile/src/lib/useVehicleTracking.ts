'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import api from './api';
import { getAccessToken } from './auth';

function getSocketUrl(): string {
  const base: string = (api.defaults.baseURL as string) ?? '';
  return base.replace('/api/v1', '');
}

/**
 * Envía la posición GPS del dispositivo al backend mientras `active` sea true.
 * Usa watchPositionAsync para recibir actualizaciones en tiempo real a medida
 * que el dispositivo se mueve (más preciso que polling con getCurrentPositionAsync,
 * que puede devolver una posición cacheada del SO).
 * Emite 'position-update' al namespace /tracking cada vez que hay un cambio
 * significativo de posición (distanceInterval: 20m) o cada 10s como máximo.
 */
export function useVehicleTracking(vehicleId: string | undefined, active: boolean) {
  const [isTracking, setIsTracking] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);

  const stopTracking = useCallback(() => {
    if (watcherRef.current) {
      watcherRef.current.remove();
      watcherRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const startTracking = useCallback(async (vid: string) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationError('Sin permiso de ubicación. Activalo en Configuración para enviar tu posición.');
      return;
    }
    setLocationError(null);

    const token = await getAccessToken();
    const socket = io(`${getSocketUrl()}/tracking`, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    // watchPositionAsync entrega la posición real del GPS cada vez que el
    // dispositivo se mueve >20m o pasa más de 10s, lo que ocurra primero.
    // A diferencia de getCurrentPositionAsync, nunca devuelve una posición cacheada.
    const watcher = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 20,   // metros mínimos de movimiento para emitir
        timeInterval: 10_000,   // máximo 10s entre actualizaciones
      },
      (location) => {
        const { latitude, longitude, speed, heading } = location.coords;
        socket.emit('position-update', {
          vehicleId: vid,
          lat: latitude,
          lng: longitude,
          speed: speed ?? 0,
          heading: heading ?? 0,
        });
      },
    );
    watcherRef.current = watcher;
    setIsTracking(true);
  }, []);

  useEffect(() => {
    if (active && vehicleId && !isTracking) {
      startTracking(vehicleId);
    } else if ((!active || !vehicleId) && isTracking) {
      stopTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, vehicleId]);

  useEffect(() => () => { stopTracking(); }, [stopTracking]);

  return { isTracking, locationError };
}
