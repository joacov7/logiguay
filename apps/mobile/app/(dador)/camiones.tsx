import { useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Truck, Star, Package } from 'lucide-react-native';
import api from '../../src/lib/api';

interface Vehicle {
  id: string;
  plate: string;
  type?: string;
  brand?: string;
  model?: string;
  year?: number;
  capacityTons?: number;
  company?: { name: string; rating?: number };
  driver?: { user?: { firstName?: string; lastName?: string } };
  status?: string;
}

export default function CamionesDadorScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['camiones-mercado'],
    queryFn: () =>
      api.get('/vehicles', { params: { limit: 50, available: true } }).then((r) => r.data),
  });

  const vehicles: Vehicle[] = data?.data ?? data ?? [];

  const onRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  if (isLoading) {
    return <View style={s.centered}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={s.header}>
        <Text style={s.headerTitle}>Transportistas</Text>
        <Text style={s.headerSub}>{vehicles.length} disponible{vehicles.length !== 1 ? 's' : ''}</Text>
      </View>
      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={vehicles.length === 0 ? s.emptyContainer : s.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#1e3a8a" />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🚛</Text>
            <Text style={s.emptyTitle}>Sin camiones disponibles</Text>
            <Text style={s.emptySub}>No hay transportistas registrados disponibles en este momento.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const driverName = item.driver?.user
            ? `${item.driver.user.firstName ?? ''} ${item.driver.user.lastName ?? ''}`.trim()
            : null;
          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={s.plateBox}>
                  <Truck size={14} color="#1e3a8a" />
                  <Text style={s.plate}>{item.plate}</Text>
                </View>
                {item.type && (
                  <View style={s.typeBadge}>
                    <Text style={s.typeText}>{item.type}</Text>
                  </View>
                )}
              </View>

              {item.company?.name && (
                <Text style={s.companyName}>{item.company.name}</Text>
              )}

              {item.company?.rating != null && (
                <View style={s.ratingRow}>
                  <Star size={13} color="#f59e0b" fill="#f59e0b" />
                  <Text style={s.rating}>{item.company.rating.toFixed(1)}</Text>
                </View>
              )}

              <View style={s.cardBottom}>
                {item.capacityTons != null && (
                  <View style={s.metaItem}>
                    <Package size={13} color="#9ca3af" />
                    <Text style={s.meta}>Cap. {item.capacityTons} t</Text>
                  </View>
                )}
                {driverName && (
                  <Text style={s.meta} numberOfLines={1}>{driverName}</Text>
                )}
                {item.year && <Text style={s.meta}>{item.year}</Text>}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#fff', paddingHorizontal: 20,
    paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1e3a8a' },
  headerSub: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 32 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  plateBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  plate: { fontSize: 16, fontWeight: '800', color: '#1e3a8a', letterSpacing: 1 },
  typeBadge: { backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  typeText: { fontSize: 12, fontWeight: '600', color: '#1e40af' },
  companyName: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  rating: { fontSize: 13, fontWeight: '700', color: '#f59e0b' },
  cardBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6', marginTop: 4,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 12, color: '#9ca3af' },
});
