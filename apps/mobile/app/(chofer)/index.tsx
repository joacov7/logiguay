import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import { MapPin, Navigation, Package, ChevronRight } from 'lucide-react-native';
import { getUser } from '../../src/lib/auth';
import api from '../../src/lib/api';
import { User, Trip, TripStatus } from '../../src/lib/types';

const STATUS_LABEL: Record<string, string> = {
  ASIGNADO: 'Asignado',
  EN_CAMINO_ORIGEN: 'En camino al origen',
  EN_CARGA: 'En carga',
  EN_TRANSITO: 'En tránsito',
  EN_DESCARGA: 'En descarga',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

const NEXT_STATUS: Record<string, { status: string; label: string; color: string } | null> = {
  ASIGNADO: { status: 'EN_CAMINO_ORIGEN', label: 'Salir hacia el origen', color: '#2563eb' },
  EN_CAMINO_ORIGEN: { status: 'EN_CARGA', label: 'Llegué al origen', color: '#d97706' },
  EN_CARGA: { status: 'EN_TRANSITO', label: 'Carga completa — Salir', color: '#16a34a' },
  EN_TRANSITO: { status: 'EN_DESCARGA', label: 'Llegué al destino', color: '#d97706' },
  EN_DESCARGA: { status: 'FINALIZADO', label: 'Descarga completa — Finalizar', color: '#16a34a' },
  FINALIZADO: null,
  CANCELADO: null,
};

export default function ChoferTripScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);

  async function fetchTrip(u?: User | null) {
    const currentUser = u ?? user;
    if (!currentUser) return;
    try {
      const res = await api.get('/trips', { params: { status: 'ASIGNADO,EN_CAMINO_ORIGEN,EN_CARGA,EN_TRANSITO,EN_DESCARGA' } });
      const trips = res.data?.data ?? res.data ?? [];
      setTrip(trips[0] ?? null);
    } catch (e) {
      setTrip(null);
    }
  }

  useEffect(() => {
    getUser().then(async (u) => {
      setUser(u);
      await fetchTrip(u);
      setLoading(false);
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrip();
    setRefreshing(false);
  }, [user]);

  async function advanceStatus() {
    if (!trip) return;
    const next = NEXT_STATUS[trip.status];
    if (!next) return;

    Alert.alert('Confirmar', `¿${next.label}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          setUpdating(true);
          try {
            await api.patch(`/trips/${trip.id}/status`, { status: next.status });
            await fetchTrip();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || 'No se pudo actualizar el estado');
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1e3a8a" />}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={s.header}>
        <Text style={s.headerTitle}>Mi Viaje</Text>
        {user && <Text style={s.headerSub}>Hola, {user.firstName}</Text>}
      </View>

      {!trip ? (
        <View style={s.empty}>
          <Package color="#9ca3af" size={48} />
          <Text style={s.emptyTitle}>Sin viaje activo</Text>
          <Text style={s.emptySub}>Tu transportista te asignará un viaje.</Text>
        </View>
      ) : (
        <View style={s.content}>
          {/* Status */}
          <View style={s.statusCard}>
            <Text style={s.statusLabel}>Estado actual</Text>
            <Text style={s.statusValue}>{STATUS_LABEL[trip.status] ?? trip.status}</Text>
          </View>

          {/* Route */}
          {trip.cargo && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Ruta</Text>
              <View style={s.routeRow}>
                <View style={[s.dot, { backgroundColor: '#22c55e' }]} />
                <View style={s.routeInfo}>
                  <Text style={s.routeLabel}>ORIGEN</Text>
                  <Text style={s.routeText}>{trip.cargo.originAddress}</Text>
                </View>
              </View>
              <View style={s.routeLine} />
              <View style={s.routeRow}>
                <View style={[s.dot, { backgroundColor: '#ef4444' }]} />
                <View style={s.routeInfo}>
                  <Text style={s.routeLabel}>DESTINO</Text>
                  <Text style={s.routeText}>{trip.cargo.destinationAddress}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Cargo info */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Carga</Text>
            {trip.cargo && (
              <>
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Tipo</Text>
                  <Text style={s.infoValue}>{trip.cargo.type}</Text>
                </View>
                {trip.cargo.weightTons != null && (
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Peso</Text>
                    <Text style={s.infoValue}>{trip.cargo.weightTons} t</Text>
                  </View>
                )}
              </>
            )}
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Tarifa acordada</Text>
              <Text style={[s.infoValue, { color: '#1e3a8a', fontWeight: '700' }]}>
                ${trip.agreedRate?.toLocaleString('es-AR')}
              </Text>
            </View>
          </View>

          {/* Action button */}
          {NEXT_STATUS[trip.status] && (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: NEXT_STATUS[trip.status]!.color }]}
              onPress={advanceStatus}
              disabled={updating}
              activeOpacity={0.8}
            >
              {updating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={s.actionText}>{NEXT_STATUS[trip.status]!.label}</Text>
                  <ChevronRight color="#fff" size={20} />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#fff', paddingHorizontal: 20,
    paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1e3a8a' },
  headerSub: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 32 },
  content: { padding: 16, gap: 12 },
  statusCard: {
    backgroundColor: '#1e3a8a', borderRadius: 16, padding: 20,
    alignItems: 'center',
  },
  statusLabel: { color: '#93c5fd', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  statusValue: { color: '#fff', fontSize: 22, fontWeight: '800' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6, elevation: 2,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  routeInfo: { flex: 1 },
  routeLabel: { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.5 },
  routeText: { fontSize: 14, color: '#111827', fontWeight: '500', marginTop: 2 },
  routeLine: { width: 1, height: 16, backgroundColor: '#d1d5db', marginLeft: 4.5, marginVertical: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  infoLabel: { fontSize: 13, color: '#6b7280' },
  infoValue: { fontSize: 13, color: '#111827', fontWeight: '500' },
  actionBtn: {
    borderRadius: 14, padding: 18, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8, elevation: 4, marginTop: 4,
  },
  actionText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
