import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Package, Plus } from 'lucide-react-native';
import api, { getApiErrorMessage } from '../../src/lib/api';
import { getUser } from '../../src/lib/auth';
import { User } from '../../src/lib/types';
import { formatRouteShort } from '../../src/lib/formatAddress';

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
      setError(getApiErrorMessage(e, 'Error al cargar las cargas.'));
    }
  }

  useEffect(() => {
    getUser().then(async (u) => {
      setUser(u);
      await fetchCargas(u);
      setLoading(false);
    });
  }, []);

  // Refetch al volver a la pantalla: tras aceptar una cotización en el detalle,
  // el estado/ofertas de la lista quedarían viejos hasta un pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      if (user) fetchCargas(user);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]),
  );

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
          const offers = item._count?.quotes ?? 0;
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
                <View style={[s.badge, { backgroundColor: colors.bg }]}>
                  <Text style={[s.badgeText, { color: colors.text }]}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </Text>
                </View>
              </View>

              {/* Ruta simplificada */}
              <Text style={s.routeShort} numberOfLines={2}>{routeShort}</Text>

              {/* Ofertas: dato más crítico para el dador */}
              <View style={[s.offersRow, offers > 0 ? s.offersActive : s.offersEmpty]}>
                <Text style={[s.offersLabel, { color: offers > 0 ? '#1e40af' : '#9ca3af' }]}>OFERTAS</Text>
                <Text style={[s.offersCount, { color: offers > 0 ? '#1e3a8a' : '#9ca3af' }]}>{offers}</Text>
              </View>

              {/* Meta secundaria */}
              <View style={s.cardBottom}>
                <Text style={s.meta}>{item.weightTons ? `${item.weightTons} t` : '—'}</Text>
                {item.requiredDate && (
                  <Text style={s.meta}>
                    {new Date(item.requiredDate).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
      {/* FAB publicar */}
      <TouchableOpacity style={s.fab} onPress={() => router.push('/(dador)/nueva-carga')}>
        <Plus size={24} color="#fff" />
      </TouchableOpacity>
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeBadge: { backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  typeText: { fontSize: 12, fontWeight: '700', color: '#1e40af' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },

  // Ruta simplificada — jerarquía 2
  routeShort: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10, lineHeight: 21 },

  // Ofertas — jerarquía 1
  offersRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 8,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
  },
  offersActive: { backgroundColor: '#eff6ff' },
  offersEmpty: { backgroundColor: '#f9fafb' },
  offersLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  offersCount: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },

  // Meta secundaria
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  meta: { fontSize: 13, color: '#9ca3af' },
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: '#1e3a8a', alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#1e3a8a', shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 8,
  },
});
