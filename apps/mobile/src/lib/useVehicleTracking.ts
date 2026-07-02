'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
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
 *
 * Robustez:
 *  - Guarda de montaje (`mountedRef`): si el componente se desmonta mientras se
 *    está resolviendo `watchPositionAsync`/`requestPermissions`, el watcher y el
 *    socket se cierran inmediatamente en lugar de quedar huérfanos (memory leak
 *    + consumo de GPS/batería en background).
 *  - El socket emite solo si está conectado, evitando encolar eventos infinitos
 *    cuando la red está caída.
 */
export function useVehicleTracking(vehicleId: string | undefined, active: boolean) {
  const [isTracking, setIsTracking] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const mountedRef = useRef(true);
  const startingRef = useRef(false); // evita arranques concurrentes

  const stopTracking = useCallback(() => {
    startingRef.current = false;
    if (watcherRef.current) {
      watcherRef.current.remove();
      watcherRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (mountedRef.current) setIsTracking(false);
  }, []);

  const startTracking = useCallback(async (vid: string) => {
    if (startingRef.current || watcherRef.current) return;
    startingRef.current = true;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      // El componente pudo desmontarse mientras pedíamos permiso.
      if (!mountedRef.current) return;
      if (status !== 'granted') {
        setLocationError('Sin permiso de ubicación. Activalo en Configuración para enviar tu posición.');
        return;
      }
      setLocationError(null);

      const token = await getAccessToken();
      if (!mountedRef.current) return;

      const socket = io(`${getSocketUrl()}/tracking`, {
        transports: ['websocket'],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });
      socketRef.current = socket;

      const watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 20,
          timeInterval: 10_000,
        },
        (location) => {
          const sock = socketRef.current;
          // Solo emitimos si el socket sigue conectado: evita encolar eventos
          // indefinidamente cuando la red está caída (consumo de memoria).
          if (!sock || !sock.connected) return;
          const { latitude, longitude, speed, heading } = location.coords;
          sock.emit('position-update', {
            vehicleId: vid,
            lat: latitude,
            lng: longitude,
            speed: speed ?? 0,
            heading: heading ?? 0,
          });
        },
      );

      // Carrera: si nos desmontamos mientras watchPositionAsync resolvía, el
      // watcher recién creado quedaría huérfano. Lo cerramos en el acto.
      if (!mountedRef.current) {
        watcher.remove();
        socket.disconnect();
        socketRef.current = null;
        return;
      }

      watcherRef.current = watcher;
      setIsTracking(true);
    } catch (e) {
      // watchPositionAsync puede rechazar (ubicación del SO apagada, etc.):
      // sin este catch el socket recién abierto quedaría conectado para siempre.
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (mountedRef.current) {
        setLocationError('No se pudo iniciar el GPS. Verificá que la ubicación esté activada.');
      }
    } finally {
      startingRef.current = false;
    }
  }, []);

  // Arranque/parada según `active` y disponibilidad de vehicleId.
  // Siempre se para antes de arrancar: si cambia el vehicleId con un watcher
  // vivo, el closure viejo seguiría reportando posiciones del vehículo anterior.
  useEffect(() => {
    stopTracking();
    if (active && vehicleId) {
      startTracking(vehicleId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, vehicleId]);

  // Al volver al primer plano, siempre reiniciar: el watcher y el socket pueden
  // haber quedado inválidos mientras el SO suspendía la app.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active' && active && vehicleId) {
        stopTracking();
        startTracking(vehicleId);
      } else if (next.match(/inactive|background/) && watcherRef.current) {
        stopTracking();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, vehicleId]);

  // Limpieza definitiva al desmontar
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopTracking();
    };
  }, [stopTracking]);

  return { isTracking, locationError };
}
