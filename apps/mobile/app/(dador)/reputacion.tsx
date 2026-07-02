import { useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Star, TrendingUp } from 'lucide-react-native';
import api from '../../src/lib/api';

interface Rating {
  id: string;
  score: number;
  comment?: string;
  createdAt: string;
  fromCompany?: { name: string };
}

function StarRow({ score }: { score: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} color="#f59e0b" fill={i <= score ? '#f59e0b' : 'transparent'} />
      ))}
    </View>
  );
}

export default function ReputacionDadorScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['reputacion-dador'],
    queryFn: () => api.get('/ratings/my').then((r) => r.data),
  });

  const ratings: Rating[] = data?.ratings ?? data?.data ?? [];
  const average: number | null = data?.average ?? null;
  const total: number = data?.total ?? ratings.length;

  const onRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  if (isLoading) {
    return <View style={s.centered}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={s.header}>
        <Text style={s.headerTitle}>Reputación</Text>
        <Text style={s.headerSub}>{total} calificación{total !== 1 ? 'es' : ''}</Text>
      </View>

      {/* Resumen */}
      <View style={s.summaryCard}>
        <View style={s.averageBox}>
          <Text style={s.averageNumber}>{average != null ? average.toFixed(1) : '—'}</Text>
          <Star size={22} color="#f59e0b" fill="#f59e0b" />
        </View>
        <View style={s.summaryRight}>
          {average != null && <StarRow score={Math.round(average)} />}
          <View style={s.trendRow}>
            <TrendingUp size={14} color="#22c55e" />
            <Text style={s.trendText}>Basado en {total} viaje{total !== 1 ? 's' : ''}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={ratings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={ratings.length === 0 ? s.emptyContainer : s.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#1e3a8a" />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>⭐</Text>
            <Text style={s.emptyTitle}>Sin calificaciones aún</Text>
            <Text style={s.emptySub}>Los transportistas podrán calificarte al completar un viaje.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardTop}>
              <StarRow score={item.score} />
              <Text style={s.time}>{formatDate(item.createdAt)}</Text>
            </View>
            {item.fromCompany?.name && (
              <Text style={s.company}>{item.fromCompany.name}</Text>
            )}
            {item.comment && (
              <Text style={s.comment}>"{item.comment}"</Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
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
  summaryCard: {
    margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 20,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
  },
  averageBox: { alignItems: 'center', gap: 4 },
  averageNumber: { fontSize: 40, fontWeight: '800', color: '#1e3a8a', lineHeight: 44 },
  summaryRight: { gap: 8 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendText: { fontSize: 13, color: '#6b7280' },
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 32 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 }, shadowRadius: 4,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  time: { fontSize: 12, color: '#9ca3af' },
  company: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 },
  comment: { fontSize: 14, color: '#6b7280', fontStyle: 'italic', lineHeight: 20 },
});
