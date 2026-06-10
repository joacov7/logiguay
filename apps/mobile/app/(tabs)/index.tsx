import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { getUser } from '../../src/lib/auth';
import { Trip, TripStatus, User } from '../../src/lib/types';

function statusColor(status: TripStatus): string {
  switch (status) {
    case TripStatus.ASIGNADO:
      return '#1e3a8a';
    case TripStatus.EN_CAMINO_ORIGEN:
    case TripStatus.EN_CARGA:
    case TripStatus.EN_TRANSITO:
    case TripStatus.EN_DESCARGA:
      return '#d97706';
    case TripStatus.FINALIZADO:
      return '#16a34a';
    case TripStatus.CANCELADO:
      return '#dc2626';
    default:
      return '#6b7280';
  }
}

function statusLabel(status: TripStatus): string {
  const map: Record<TripStatus, string> = {
    [TripStatus.ASIGNADO]: 'Asignado',
    [TripStatus.EN_CAMINO_ORIGEN]: 'En camino al origen',
    [TripStatus.EN_CARGA]: 'En carga',
    [TripStatus.EN_TRANSITO]: 'En tránsito',
    [TripStatus.EN_DESCARGA]: 'En descarga',
    [TripStatus.FINALIZADO]: 'Finalizado',
    [TripStatus.CANCELADO]: 'Cancelado',
  };
  return map[status] ?? status;
}

function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const color = statusColor(trip.status);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <Text style={styles.cargoType}>{trip.cargo.type}</Text>
        <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }]}>
          <Text style={[styles.badgeText, { color }]}>{statusLabel(trip.status)}</Text>
        </View>
      </View>
      <Text style={styles.route} numberOfLines={1}>
        {trip.cargo.originAddress}
      </Text>
      <Text style={styles.routeArrow}>↓</Text>
      <Text style={styles.route} numberOfLines={1}>
        {trip.cargo.destinationAddress}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.weight}>{trip.cargo.weightTons} ton</Text>
        <Text style={styles.rate}>
          ${Number(trip.agreedRate).toLocaleString('es-UY')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function TripsScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  const fetchTrips = useCallback(async (): Promise<Trip[]> => {
    if (!user) return [];
    const params: Record<string, string> = { limit: '20' };
    if (user.companyId) params.companyId = user.companyId;
    if (user.driverId) params.driverId = user.driverId;
    const res = await api.get('/trips', { params });
    return res.data?.data ?? res.data ?? [];
  }, [user]);

  const { data: trips, isLoading, isRefetching, refetch, error } = useQuery<Trip[]>({
    queryKey: ['trips', user?.id],
    queryFn: fetchTrips,
    enabled: !!user,
  });

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  if (!user || isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No se pudieron cargar los viajes.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={trips?.length === 0 ? styles.emptyContainer : styles.listContent}
      data={trips ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TripCard trip={item} onPress={() => router.push(`/trip/${item.id}`)} />
      )}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#1e3a8a" />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🚚</Text>
          <Text style={styles.emptyTitle}>Sin viajes asignados</Text>
          <Text style={styles.emptySubtitle}>Cuando tengas viajes asignados aparecerán aquí.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cargoType: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  route: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 2,
  },
  routeArrow: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  weight: {
    fontSize: 13,
    color: '#6b7280',
  },
  rate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 15,
    color: '#dc2626',
  },
  retryButton: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
});
