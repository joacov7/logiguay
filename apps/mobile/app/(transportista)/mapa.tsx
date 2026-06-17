import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, StatusBar, ScrollView,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import api from '../../src/lib/api';

interface FleetVehicle {
  id: string;
  plate: string;
  type: string;
  brand: string;
  model: string;
  position: {
    lat: number;
    lng: number;
    speed?: number;
    heading?: number;
    timestamp: string;
  } | null;
  activeTrip: { id: string; status: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  ASIGNADO: 'Asignado',
  EN_CAMINO_ORIGEN: 'En camino',
  EN_CARGA: 'En carga',
  EN_TRANSITO: 'En tránsito',
  EN_DESCARGA: 'En descarga',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

function minutesAgo(timestamp: string): string {
  const mins = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
  if (mins < 1) return 'Ahora';
  if (mins === 1) return 'Hace 1 min';
  if (mins < 60) return `Hace ${mins} min`;
  const h = Math.floor(mins / 60);
  return `Hace ${h}h`;
}

export default function MapaFlotaScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery<FleetVehicle[]>({
    queryKey: ['fleet-positions'],
    queryFn: () => api.get('/tracking/fleet').then((r) => r.data),
    refetchInterval: 15_000,
  });

  const vehicles = data ?? [];
  const withPosition = vehicles.filter((v) => v.position);

  // Fit map to show all vehicles on first load
  useEffect(() => {
    if (!mapRef.current || withPosition.length === 0) return;
    mapRef.current.fitToCoordinates(
      withPosition.map((v) => ({ latitude: v.position!.lat, longitude: v.position!.lng })),
      { edgePadding: { top: 80, right: 40, bottom: 200, left: 40 }, animated: true },
    );
  }, [withPosition.length]);

  const selectedVehicle = selected ? vehicles.find((v) => v.id === selected) : null;

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#15A66A" />
        <Text style={s.loadingText}>Cargando flota…</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Mapa de flota</Text>
          <Text style={s.headerSub}>
            {withPosition.length} de {vehicles.length} vehículo{vehicles.length !== 1 ? 's' : ''} con señal
          </Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={() => refetch()} disabled={isRefetching}>
          <Text style={s.refreshText}>{isRefetching ? '…' : '↻'}</Text>
        </TouchableOpacity>
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={s.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: -33.0,
          longitude: -61.0,
          latitudeDelta: 10,
          longitudeDelta: 10,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {withPosition.map((v) => (
          <Marker
            key={v.id}
            coordinate={{ latitude: v.position!.lat, longitude: v.position!.lng }}
            onPress={() => setSelected(v.id)}
            pinColor={v.activeTrip ? '#15A66A' : '#6b7280'}
          >
            <Callout tooltip onPress={() => {
              if (v.activeTrip) router.push(`/trip/${v.activeTrip.id}`);
            }}>
              <View style={s.callout}>
                <Text style={s.calloutPlate}>{v.plate}</Text>
                <Text style={s.calloutMeta}>{v.brand} {v.model}</Text>
                {v.activeTrip && (
                  <Text style={s.calloutStatus}>
                    {STATUS_LABEL[v.activeTrip.status] ?? v.activeTrip.status}
                  </Text>
                )}
                {v.position?.speed != null && (
                  <Text style={s.calloutMeta}>{Math.round((v.position.speed ?? 0) * 3.6)} km/h</Text>
                )}
                <Text style={s.calloutTime}>{minutesAgo(v.position!.timestamp)}</Text>
                {v.activeTrip && (
                  <Text style={s.calloutLink}>Tap para ver el viaje →</Text>
                )}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Bottom list of vehicles without position */}
      {vehicles.length > 0 && (
        <View style={s.listContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {vehicles.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={[s.chip, v.position ? s.chipActive : s.chipOffline]}
                onPress={() => {
                  if (v.position && mapRef.current) {
                    mapRef.current.animateToRegion({
                      latitude: v.position.lat,
                      longitude: v.position.lng,
                      latitudeDelta: 0.05,
                      longitudeDelta: 0.05,
                    }, 500);
                    setSelected(v.id);
                  }
                }}
              >
                <Text style={[s.chipPlate, !v.position && s.chipPlateOffline]}>{v.plate}</Text>
                <Text style={s.chipStatus}>
                  {v.position ? minutesAgo(v.position.timestamp) : 'Sin señal'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Empty state */}
      {vehicles.length === 0 && (
        <View style={s.emptyOverlay}>
          <Text style={s.emptyIcon}>🚛</Text>
          <Text style={s.emptyTitle}>Sin vehículos</Text>
          <Text style={s.emptySub}>Agregá vehículos a tu flota para verlos en el mapa.</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#6b7280', fontSize: 14 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    zIndex: 10,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  headerSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  refreshText: { fontSize: 20, color: '#374151' },

  map: { flex: 1 },

  callout: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    minWidth: 160,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  calloutPlate: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 2 },
  calloutMeta: { fontSize: 12, color: '#6b7280' },
  calloutStatus: {
    fontSize: 12, fontWeight: '700', color: '#15A66A',
    marginTop: 4,
  },
  calloutTime: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  calloutLink: { fontSize: 12, color: '#2563eb', marginTop: 6, fontWeight: '600' },

  listContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 8,
    elevation: 8,
  },
  chips: { paddingHorizontal: 16, gap: 8 },
  chip: {
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    minWidth: 90, alignItems: 'center',
  },
  chipActive: { backgroundColor: '#dcfce7' },
  chipOffline: { backgroundColor: '#f3f4f6' },
  chipPlate: { fontSize: 14, fontWeight: '700', color: '#15A66A' },
  chipPlateOffline: { color: '#9ca3af' },
  chipStatus: { fontSize: 11, color: '#6b7280', marginTop: 2 },

  emptyOverlay: {
    position: 'absolute',
    top: '40%',
    left: 0, right: 0,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
});
