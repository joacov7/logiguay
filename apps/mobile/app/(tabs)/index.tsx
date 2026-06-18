import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getUser } from '../../src/lib/auth';
import api, { getApiErrorMessage } from '../../src/lib/api';
import { Trip, TripStatus, User } from '../../src/lib/types';

const STATUS_LABEL: Record<TripStatus, string> = {
  [TripStatus.ASIGNADO]: 'Asignado',
  [TripStatus.EN_CAMINO_ORIGEN]: 'En camino al origen',
  [TripStatus.EN_CARGA]: 'En carga',
  [TripStatus.EN_TRANSITO]: 'En tránsito',
  [TripStatus.EN_DESCARGA]: 'En descarga',
  [TripStatus.FINALIZADO]: 'Finalizado',
  [TripStatus.CANCELADO]: 'Cancelado',
};

const STATUS_COLOR: Record<TripStatus, { bg: string; text: string }> = {
  [TripStatus.ASIGNADO]: { bg: '#dbeafe', text: '#1e40af' },
  [TripStatus.EN_CAMINO_ORIGEN]: { bg: '#fef9c3', text: '#854d0e' },
  [TripStatus.EN_CARGA]: { bg: '#fef9c3', text: '#854d0e' },
  [TripStatus.EN_TRANSITO]: { bg: '#dcfce7', text: '#166534' },
  [TripStatus.EN_DESCARGA]: { bg: '#fef9c3', text: '#854d0e' },
  [TripStatus.FINALIZADO]: { bg: '#f3f4f6', text: '#6b7280' },
  [TripStatus.CANCELADO]: { bg: '#fee2e2', text: '#991b1b' },
};

function StatusBadge({ status }: { status: TripStatus }) {
  const colors = STATUS_COLOR[status] ?? { bg: '#f3f4f6', text: '#6b7280' };
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>
        {STATUS_LABEL[status] ?? status}
      </Text>
    </View>
  );
}

function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.cargoType}>{trip.cargo.type}</Text>
        <StatusBadge status={trip.status} />
      </View>
      <View style={styles.route}>
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
          <Text style={styles.routeText} numberOfLines={1}>
            {trip.cargo.originAddress}
          </Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.routeText} numberOfLines={1}>
            {trip.cargo.destinationAddress}
          </Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.weight}>{trip.cargo.weightTons} t</Text>
        <Text style={styles.rate}>
          ${trip.agreedRate.toLocaleString('es-UY')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function TripsScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchTrips(currentUser?: User | null) {
    const u = currentUser ?? user;
    if (!u) return;
    try {
      const params: Record<string, string> = {};
      if (u.companyId) params.companyId = u.companyId;
      if (u.driverId) params.driverId = u.driverId;
      const res = await api.get('/trips', { params });
      setTrips((res.data?.data ?? res.data) as Trip[]);
      setError(null);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, 'Error al cargar los viajes.'));
    }
  }

  useEffect(() => {
    getUser().then(async (u) => {
      setUser(u);
      await fetchTrips(u);
      setLoading(false);
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrips();
    setRefreshing(false);
  }, [user]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis viajes</Text>
        {user && (
          <Text style={styles.headerSub}>
            Hola, {user.firstName}
          </Text>
        )}
      </View>
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          trips.length === 0 ? styles.emptyContainer : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1e3a8a"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🚛</Text>
            <Text style={styles.emptyTitle}>Sin viajes asignados</Text>
            <Text style={styles.emptySubtitle}>
              Deslizá hacia abajo para actualizar.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TripCard
            trip={item}
            onPress={() => router.push(`/trip/${item.id}`)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1e3a8a' },
  headerSub: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  errorBanner: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  errorText: { color: '#dc2626', fontSize: 14 },
  listContent: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cargoType: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  route: { marginBottom: 12 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  routeText: { fontSize: 13, color: '#374151', flex: 1 },
  routeLine: {
    width: 1,
    height: 12,
    backgroundColor: '#d1d5db',
    marginLeft: 3.5,
    marginVertical: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  weight: { fontSize: 13, color: '#6b7280' },
  rate: { fontSize: 15, fontWeight: '700', color: '#1e3a8a' },
});
