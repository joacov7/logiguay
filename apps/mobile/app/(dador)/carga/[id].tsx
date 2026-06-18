import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Building2, Check, X } from 'lucide-react-native';
import api, { getApiErrorMessage } from '../../../src/lib/api';

interface Quote {
  id: string;
  amount: number;
  notes?: string;
  status: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';
  createdAt: string;
  transportCompany: { id: string; name: string };
}

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  ACEPTADA: 'Aceptada',
  RECHAZADA: 'Rechazada',
};

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  PENDIENTE: { bg: '#fef9c3', text: '#854d0e' },
  ACEPTADA:  { bg: '#dcfce7', text: '#166534' },
  RECHAZADA: { bg: '#fee2e2', text: '#991b1b' },
};

export default function CargoQuotesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchQuotes() {
    try {
      const res = await api.get(`/quotes/cargo/${id}`);
      setQuotes(res.data?.data ?? []);
      setError(null);
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Error al cargar cotizaciones.'));
    }
  }

  useEffect(() => {
    fetchQuotes().finally(() => setLoading(false));
  }, [id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchQuotes();
    setRefreshing(false);
  }, [id]);

  function confirmAccept(quote: Quote) {
    Alert.alert(
      'Aceptar cotización',
      `¿Asignar la carga a ${quote.transportCompany?.name ?? '—'} por $${quote.amount?.toLocaleString('es-AR') ?? '—'}? Las demás ofertas serán rechazadas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar oferta',
          onPress: async () => {
            setActing(quote.id);
            try {
              await api.patch(`/quotes/${quote.id}/accept`);
              Alert.alert('¡Listo!', 'Carga asignada. Se creó el viaje.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (e: any) {
              Alert.alert('Error', getApiErrorMessage(e, 'No se pudo aceptar.'));
            } finally {
              setActing(null);
            }
          },
        },
      ],
    );
  }

  async function reject(quote: Quote) {
    setActing(quote.id);
    try {
      await api.patch(`/quotes/${quote.id}/reject`);
      await fetchQuotes();
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e, 'No se pudo rechazar.'));
    } finally {
      setActing(null);
    }
  }

  if (loading) {
    return <View style={s.centered}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
  }

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Cotizaciones', headerTintColor: '#1e3a8a' }} />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {error && <View style={s.errorBanner}><Text style={s.errorText}>{error}</Text></View>}

      <FlatList
        data={quotes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={quotes.length === 0 ? s.emptyContainer : s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1e3a8a" />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>💸</Text>
            <Text style={s.emptyTitle}>Sin cotizaciones aún</Text>
            <Text style={s.emptySub}>Cuando un transportista cotice tu carga, la verás acá.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const colors = STATUS_COLOR[item.status];
          const busy = acting === item.id;
          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={s.companyRow}>
                  <Building2 color="#6b7280" size={15} />
                  <Text style={s.companyName}>{item.transportCompany.name}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: colors.bg }]}>
                  <Text style={[s.badgeText, { color: colors.text }]}>{STATUS_LABEL[item.status]}</Text>
                </View>
              </View>

              <Text style={s.amount}>{item.amount != null ? `$${item.amount.toLocaleString('es-AR')}` : '—'}</Text>
              {item.notes ? <Text style={s.notes}>{item.notes}</Text> : null}

              {item.status === 'PENDIENTE' && (
                <View style={s.actions}>
                  <TouchableOpacity
                    style={[s.btn, s.btnReject, busy && s.btnDisabled]}
                    onPress={() => reject(item)}
                    disabled={busy}
                  >
                    <X color="#dc2626" size={16} />
                    <Text style={s.btnRejectText}>Rechazar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.btn, s.btnAccept, busy && s.btnDisabled]}
                    onPress={() => confirmAccept(item)}
                    disabled={busy}
                  >
                    {busy ? <ActivityIndicator color="#fff" size="small" /> : (
                      <>
                        <Check color="#fff" size={16} />
                        <Text style={s.btnAcceptText}>Aceptar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorBanner: { backgroundColor: '#fef2f2', paddingHorizontal: 16, paddingVertical: 10 },
  errorText: { color: '#dc2626', fontSize: 14 },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6, elevation: 3,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  companyName: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  amount: { fontSize: 24, fontWeight: '800', color: '#1e3a8a', marginBottom: 4 },
  notes: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 10, paddingVertical: 11,
  },
  btnReject: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#fecaca' },
  btnRejectText: { color: '#dc2626', fontSize: 14, fontWeight: '700' },
  btnAccept: { backgroundColor: '#16a34a' },
  btnAcceptText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
