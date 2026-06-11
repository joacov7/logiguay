import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Package } from 'lucide-react-native';
import api from '../../src/lib/api';
import { getUser } from '../../src/lib/auth';
import { User } from '../../src/lib/types';

interface Cargo {
  id: string;
  type: string;
  status: string;
  originAddress: string;
  destinationAddress: string;
  weightTons: number | null;
  requiredDate: string | null;
  _count: { quotes: number };
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  BORRADOR:   { bg: '#f3f4f6', text: '#6b7280' },
  PUBLICADO:  { bg: '#dbeafe', text: '#1e40af' },
  COTIZANDO:  { bg: '#fef9c3', text: '#854d0e' },
  ASIGNADO:   { bg: '#dcfce7', text: '#166534' },
  EN_TRANSITO:{ bg: '#dcfce7', text: '#166534' },
  FINALIZADO: { bg: '#f3f4f6', text: '#6b7280' },
  CANCELADO:  { bg: '#fee2e2', text: '#991b1b' },
};

const STATUS_LABEL: Record<string, string> = {
  BORRADOR: 'Borrador', PUBLICADO: 'Publicado', COTIZANDO: 'Cotizando',
  ASIGNADO: 'Asignado', EN_TRANSITO: 'En tránsito',
  FINALIZADO: 'Finalizado', CANCELADO: 'Cancelado',
};

export default function DadorCargasScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [cargas, setCargas] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchCargas(u?: User | null) {
    const currentUser = u ?? user;
    if (!currentUser) return;
    try {
      const res = await api.get('/cargo', { params: { limit: 30 } });
      setCargas(res.data?.data ?? res.data ?? []);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error al cargar las cargas.');
    }
  }

  useEffect(() => {
    getUser().then(async (u) => {
      setUser(u);
      await fetchCargas(u);
      setLoading(false);
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCargas();
    setRefreshing(false);
  }, [user]);

  if (loading) {
    return <View style={s.centered}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={s.header}>
        <Text style={s.headerTitle}>Mis cargas</Text>
        {user && <Text style={s.headerSub}>Hola, {user.firstName}</Text>}
      </View>
      {error && (
        <View style={s.errorBanner}><Text style={s.errorText}>{error}</Text></View>
      )}
      <FlatList
        data={cargas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={cargas.length === 0 ? s.emptyContainer : s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1e3a8a" />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📦</Text>
            <Text style={s.emptyTitle}>Sin cargas publicadas</Text>
            <Text style={s.emptySub}>Tocá "Publicar" para agregar una nueva carga.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const colors = STATUS_COLORS[item.status] ?? { bg: '#f3f4f6', text: '#6b7280' };
          return (
            <TouchableOpacity
              style={s.card}
              activeOpacity={0.7}
              onPress={() => router.push(`/(dador)/carga/${item.id}`)}
            >
              <View style={s.cardTop}>
                <Text style={s.cargoType}>{item.type}</Text>
                <View style={[s.badge, { backgroundColor: colors.bg }]}>
                  <Text style={[s.badgeText, { color: colors.text }]}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </Text>
                </View>
              </View>
              <View style={s.routeRow}>
                <View style={[s.dot, { backgroundColor: '#22c55e' }]} />
                <Text style={s.routeText} numberOfLines={1}>{item.originAddress}</Text>
              </View>
              <View style={s.routeRow}>
                <View style={[s.dot, { backgroundColor: '#ef4444' }]} />
                <Text style={s.routeText} numberOfLines={1}>{item.destinationAddress}</Text>
              </View>
              <View style={s.cardBottom}>
                <Text style={s.meta}>{item.weightTons ? `${item.weightTons} t` : '—'}</Text>
                <Text style={s.quotes}>{item._count?.quotes ?? 0} oferta{(item._count?.quotes ?? 0) !== 1 ? 's' : ''}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
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
  errorBanner: { backgroundColor: '#fef2f2', paddingHorizontal: 16, paddingVertical: 10 },
  errorText: { color: '#dc2626', fontSize: 14 },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6, elevation: 3,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cargoType: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  routeText: { fontSize: 13, color: '#374151', flex: 1 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  meta: { fontSize: 13, color: '#6b7280' },
  quotes: { fontSize: 13, fontWeight: '600', color: '#1e3a8a' },
});
