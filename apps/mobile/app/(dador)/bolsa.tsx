import { useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Weight, Calendar } from 'lucide-react-native';
import api from '../../src/lib/api';
import { formatRouteShort } from '../../src/lib/formatAddress';

interface Cargo {
  id: string;
  type: string;
  originAddress: string;
  destinationAddress: string;
  weightTons: number | null;
  estimatedValue: number | null;
  requiredDate: string | null;
  company?: { name: string };
  _count?: { quotes: number };
}

export default function BolsaDadorScreen() {
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bolsa-dador'],
    queryFn: () =>
      api.get('/cargo', { params: { status: 'PUBLICADO', limit: 50 } }).then((r) => r.data),
  });

  const cargas: Cargo[] = data?.data ?? data ?? [];

  const onRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  if (isLoading) {
    return <View style={s.centered}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={s.header}>
        <Text style={s.headerTitle}>Bolsa de cargas</Text>
        <Text style={s.headerSub}>{cargas.length} publicada{cargas.length !== 1 ? 's' : ''}</Text>
      </View>
      <FlatList
        data={cargas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={cargas.length === 0 ? s.emptyContainer : s.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#1e3a8a" />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📦</Text>
            <Text style={s.emptyTitle}>Sin cargas en el mercado</Text>
            <Text style={s.emptySub}>No hay cargas publicadas por otras empresas en este momento.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const offerCount = item._count?.quotes ?? 0;
          const routeShort = formatRouteShort(item.originAddress, item.destinationAddress);
          return (
            <TouchableOpacity
              style={s.card}
              activeOpacity={0.7}
              onPress={() => router.push(`/(dador)/carga/${item.id}`)}
            >
              <View style={s.cardTop}>
                <View style={s.typeBadge}>
                  <Text style={s.typeText}>{item.type}</Text>
                </View>
                <View style={s.offerBadge}>
                  <Text style={s.offerText}>{offerCount} oferta{offerCount !== 1 ? 's' : ''}</Text>
                </View>
              </View>

              <Text style={s.routeShort} numberOfLines={2}>{routeShort}</Text>

              {item.estimatedValue != null && (
                <View style={s.valueRow}>
                  <Text style={s.valueLabel}>VALOR REF.</Text>
                  <Text style={s.valueAmount}>
                    ${item.estimatedValue.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </Text>
                </View>
              )}

              <View style={s.cardBottom}>
                {item.weightTons ? (
                  <View style={s.metaItem}>
                    <Weight size={12} color="#9CA3AF" />
                    <Text style={s.meta}>{item.weightTons} t</Text>
                  </View>
                ) : <View />}
                {item.requiredDate && (
                  <View style={s.metaItem}>
                    <Calendar size={12} color="#9CA3AF" />
                    <Text style={s.meta}>
                      {new Date(item.requiredDate).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                    </Text>
                  </View>
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
  emptySub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 32 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    elevation: 2, shadowColor: '#000',
    shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeBadge: { backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  typeText: { fontSize: 12, fontWeight: '700', color: '#1e40af' },
  offerBadge: { backgroundColor: '#DBEAFE', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  offerText: { fontSize: 12, fontWeight: '600', color: '#1E40AF' },
  routeShort: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10, lineHeight: 21 },
  valueRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 8,
    backgroundColor: '#eff6ff', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
  },
  valueLabel: { fontSize: 10, fontWeight: '700', color: '#1e40af', letterSpacing: 0.8 },
  valueAmount: { fontSize: 20, fontWeight: '800', color: '#1e3a8a', letterSpacing: -0.5 },
  cardBottom: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 12, color: '#9CA3AF' },
});
