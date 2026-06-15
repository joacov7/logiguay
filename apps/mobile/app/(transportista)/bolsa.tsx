import { useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../src/lib/api';

interface Cargo {
  id: string;
  type: string;
  originAddress: string;
  destinationAddress: string;
  weightTons: number | null;
  requiredDate: string | null;
  _count?: { quotes: number };
}

export default function BolsaScreen() {
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bolsa-cargas'],
    queryFn: () =>
      api.get('/cargo', { params: { status: 'PUBLICADO', limit: 50 } }).then((r) => r.data),
  });

  const cargas: Cargo[] = data?.data ?? data ?? [];

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
        <Text style={s.headerTitle}>Bolsa de cargas</Text>
        <Text style={s.headerSub}>{cargas.length} disponible{cargas.length !== 1 ? 's' : ''}</Text>
      </View>
      <FlatList
        data={cargas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={cargas.length === 0 ? s.emptyContainer : s.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#15A66A" />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📦</Text>
            <Text style={s.emptyTitle}>Sin cargas disponibles</Text>
            <Text style={s.emptySub}>
              Cuando haya cargas publicadas aparecerán aquí para que puedas cotizar.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const offerCount = item._count?.quotes ?? 0;
          return (
            <TouchableOpacity
              style={s.card}
              activeOpacity={0.7}
              onPress={() => router.push(`/(dador)/carga/${item.id}`)}
            >
              <View style={s.cardTop}>
                <Text style={s.cargoType}>{item.type}</Text>
                <View style={s.offerBadge}>
                  <Text style={s.offerText}>
                    {offerCount} oferta{offerCount !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              <View style={s.routeRow}>
                <View style={[s.dot, { backgroundColor: '#15A66A' }]} />
                <Text style={s.routeText} numberOfLines={1}>{item.originAddress}</Text>
              </View>
              <View style={s.routeRow}>
                <View style={[s.dot, { backgroundColor: '#ef4444' }]} />
                <Text style={s.routeText} numberOfLines={1}>{item.destinationAddress}</Text>
              </View>
              <View style={s.cardBottom}>
                <Text style={s.meta}>
                  {item.weightTons ? `${item.weightTons} t` : '—'}
                </Text>
                {item.requiredDate && (
                  <Text style={s.date}>
                    {new Date(item.requiredDate).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
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
    alignItems: 'center',
    marginBottom: 12,
  },
  cargoType: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  offerBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  offerText: { fontSize: 12, fontWeight: '600', color: '#1E40AF' },
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
  date: { fontSize: 13, fontWeight: '600', color: '#374151' },
});
