import { useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { StatusBadge } from '../../src/components/ui';

const ACTIVE_STATUSES = 'ASIGNADO,EN_CAMINO_ORIGEN,EN_CARGA,EN_TRANSITO,EN_DESCARGA';

interface Trip {
  id: string;
  status: string;
  agreedRate: number;
  cargo: {
    type: string;
    originAddress: string;
    destinationAddress: string;
    weightTons: number;
  };
  vehicle?: { plate: string };
}

export default function ViajesScreen() {
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['transportista-viajes'],
    queryFn: () =>
      api
        .get('/trips', { params: { status: ACTIVE_STATUSES, limit: 50 } })
        .then((r) => r.data),
  });

  const trips: Trip[] = data?.data ?? data ?? [];

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#15A66A" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={s.header}>
        <Text style={s.headerTitle}>Mis viajes</Text>
        <Text style={s.headerSub}>{trips.length} activo{trips.length !== 1 ? 's' : ''}</Text>
      </View>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={trips.length === 0 ? s.emptyContainer : s.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#15A66A" />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🚛</Text>
            <Text style={s.emptyTitle}>Sin viajes activos</Text>
            <Text style={s.emptySub}>Cuando tengas viajes asignados aparecerán aquí.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            activeOpacity={0.7}
            onPress={() => router.push(`/trip/${item.id}`)}
          >
            <View style={s.cardTop}>
              <Text style={s.cargoType}>{item.cargo?.type ?? '—'}</Text>
              <StatusBadge status={item.status} />
            </View>
            <View style={s.routeRow}>
              <View style={[s.dot, { backgroundColor: '#15A66A' }]} />
              <Text style={s.routeText} numberOfLines={1}>
                {item.cargo?.originAddress ?? '—'}
              </Text>
            </View>
            <View style={s.routeRow}>
              <View style={[s.dot, { backgroundColor: '#ef4444' }]} />
              <Text style={s.routeText} numberOfLines={1}>
                {item.cargo?.destinationAddress ?? '—'}
              </Text>
            </View>
            <View style={s.cardBottom}>
              <Text style={s.meta}>
                {item.vehicle?.plate ? `🚚 ${item.vehicle.plate}` : '—'}
              </Text>
              <Text style={s.rate}>
                {item.agreedRate
                  ? `$${Number(item.agreedRate).toLocaleString('es-AR')}`
                  : '—'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  headerSub: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cargoType: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  routeText: { fontSize: 13, color: '#374151', flex: 1 },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  meta: { fontSize: 13, color: '#6B7280' },
  rate: { fontSize: 14, fontWeight: '700', color: '#15A66A' },
});
