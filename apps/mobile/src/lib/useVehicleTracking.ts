import { useEffect, useRef, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import api from './api';
import { getAccessToken } from './auth';

// Deriva la URL del WebSocket desde el baseURL de axios.
// api.defaults.baseURL es p.ej. "https://api.logiguay.com.ar/api/v1"
function getSocketUrl(): string {
  const base: string = (api.defaults.baseURL as string) ?? '';
  return base.replace('/api/v1', '');
}

/**
 * Envía la posición GPS del dispositivo al backend mientras `active` sea true.
 * Conecta al namespace /tracking con el token de auth y emite 'position-update'
 * con el vehicleId cada 15 segundos. El gateway guarda la posición por vehículo,
 * que luego aparece en el mapa de flota (GET /tracking/fleet).
 */
export function useVehicleTracking(vehicleId: string | undefined, active: boolean) {
  const [isTracking, setIsTracking] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendLocation = useCallback(async (socket: Socket, vid: string) => {
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude, speed, heading } = position.coords;
      socket.emit('position-update', {
        vehicleId: vid,
        lat: latitude,
        lng: longitude,
        speed: speed ?? 0,
        heading: heading ?? 0,
      });
    } catch {
      // Silencioso — el próximo tick reintenta
    }
  }, []);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const startTracking = useCallback(
    async (vid: string) => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError(
          'Sin permiso de ubicación. Activalo en Configuración para enviar tu posición.',
        );
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

      await sendLocation(socket, vid);
      intervalRef.current = setInterval(() => sendLocation(socket, vid), 15_000);
      setIsTracking(true);
    },
    [sendLocation],
  );

  useEffect(() => {
    if (active && vehicleId && !isTracking) {
      startTracking(vehicleId);
    } else if ((!active || !vehicleId) && isTracking) {
      stopTracking();
    }
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [active, vehicleId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup al desmontar
  useEffect(() => stopTracking, [stopTracking]);

  return { isTracking, locationError };
}
