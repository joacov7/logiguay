import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, MapPin, X } from 'lucide-react-native';
import api, { getApiErrorMessage } from '../../src/lib/api';

type BookingStatus = 'CONFIRMADO' | 'EN_ESPERA' | 'EN_ATENCION' | 'DEMORADO' | 'COMPLETADO' | 'CANCELADO';

const STATUS_COLOR: Record<BookingStatus, { bg: string; text: string }> = {
  CONFIRMADO:  { bg: '#dcfce7', text: '#166534' },
  EN_ESPERA:   { bg: '#fef9c3', text: '#854d0e' },
  EN_ATENCION: { bg: '#dbeafe', text: '#1e40af' },
  DEMORADO:    { bg: '#fee2e2', text: '#991b1b' },
  COMPLETADO:  { bg: '#f3f4f6', text: '#6b7280' },
  CANCELADO:   { bg: '#f3f4f6', text: '#9ca3af' },
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  CONFIRMADO: 'Confirmado', EN_ESPERA: 'En espera',
  EN_ATENCION: 'En atención', DEMORADO: 'Demorado',
  COMPLETADO: 'Completado', CANCELADO: 'Cancelado',
};

export default function TurnosDadorScreen() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'disponibles' | 'misreservas'>('disponibles');

  const { data: slots = [], isLoading: loadingSlots, refetch: refetchSlots, isRefetching: refetchingSlots } = useQuery<any[]>({
    queryKey: ['turnos-slots-dador'],
    queryFn: () => api.get('/turnos/slots', { params: { available: true, limit: 50 } }).then(r => r.data?.data ?? r.data ?? []),
    enabled: tab === 'disponibles',
  });

  const { data: bookings = [], isLoading: loadingBookings, refetch: refetchBookings, isRefetching: refetchingBookings } = useQuery<any[]>({
    queryKey: ['turnos-bookings-dador'],
    queryFn: () => api.get('/turnos/my-bookings').then(r => r.data?.data ?? r.data ?? []),
    enabled: tab === 'misreservas',
  });

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => api.patch(`/turnos/bookings/${bookingId}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['turnos-bookings-dador'] }); },
    onError: (e: any) => Alert.alert('Error', getApiErrorMessage(e, 'No se pudo cancelar.')),
  });

  const bookMutation = useMutation({
    mutationFn: (slotId: string) => api.post('/turnos/bookings', { slotId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['turnos-slots-dador'] });
      Alert.alert('¡Listo!', 'Turno reservado correctamente.');
    },
    onError: (e: any) => Alert.alert('Error', getApiErrorMessage(e, 'No se pudo reservar.')),
  });

  function confirmBook(slot: any) {
    const fecha = slot.date ? new Date(slot.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
    Alert.alert(
      'Reservar turno',
      `¿Reservar el turno del ${fecha} a las ${slot.time ?? '—'} en ${slot.location ?? 'la terminal'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Reservar', onPress: () => bookMutation.mutate(slot.id) },
      ],
    );
  }

  function confirmCancel(booking: any) {
    Alert.alert(
      'Cancelar turno',
      '¿Confirmás que querés cancelar este turno?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Cancelar turno', style: 'destructive', onPress: () => cancelMutation.mutate(booking.id) },
      ],
    );
  }

  const isLoading = tab === 'disponibles' ? loadingSlots : loadingBookings;
  const isRefetching = tab === 'disponibles' ? refetchingSlots : refetchingBookings;
  const onRefresh = useCallback(() => {
    tab === 'disponibles' ? refetchSlots() : refetchBookings();
  }, [tab]);

  const listData = tab === 'disponibles' ? slots : bookings;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={s.header}>
        <Text style={s.headerTitle}>Turnos</Text>
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'disponibles' && s.tabBtnActive]}
          onPress={() => setTab('disponibles')}
        >
          <Text style={[s.tabText, tab === 'disponibles' && s.tabTextActive]}>Disponibles</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'misreservas' && s.tabBtnActive]}
          onPress={() => setTab('misreservas')}
        >
          <Text style={[s.tabText, tab === 'misreservas' && s.tabTextActive]}>Mis reservas</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={s.centered}><ActivityIndicator size="large" color="#1e3a8a" /></View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={listData.length === 0 ? s.emptyContainer : s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#1e3a8a" />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>{tab === 'disponibles' ? '📅' : '🗓️'}</Text>
              <Text style={s.emptyTitle}>
                {tab === 'disponibles' ? 'Sin turnos disponibles' : 'Sin reservas activas'}
              </Text>
              <Text style={s.emptySub}>
                {tab === 'disponibles'
                  ? 'No hay turnos disponibles en este momento.'
                  : 'Reservá un turno desde la pestaña "Disponibles".'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            if (tab === 'disponibles') {
              const fecha = item.date
                ? new Date(item.date).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' })
                : '—';
              return (
                <View style={s.card}>
                  <View style={s.cardRow}>
                    <View style={s.cardInfo}>
                      <View style={s.metaItem}>
                        <Calendar size={14} color="#1e3a8a" />
                        <Text style={s.cardDate}>{fecha}</Text>
                        {item.time && <Text style={s.cardTime}> · {item.time}</Text>}
                      </View>
                      {item.location && (
                        <View style={s.metaItem}>
                          <MapPin size={13} color="#9ca3af" />
                          <Text style={s.cardLocation} numberOfLines={1}>{item.location}</Text>
                        </View>
                      )}
                      {item.capacity != null && (
                        <View style={s.metaItem}>
                          <Clock size={13} color="#9ca3af" />
                          <Text style={s.cardMeta}>{item.capacity} lugar{item.capacity !== 1 ? 'es' : ''} disponible{item.capacity !== 1 ? 's' : ''}</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={s.bookBtn}
                      onPress={() => confirmBook(item)}
                      disabled={bookMutation.isPending}
                    >
                      <Text style={s.bookBtnText}>Reservar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }

            const colors = STATUS_COLOR[item.status as BookingStatus] ?? { bg: '#f3f4f6', text: '#6b7280' };
            const fecha = item.slot?.date
              ? new Date(item.slot.date).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' })
              : '—';
            const canCancel = !['COMPLETADO', 'CANCELADO'].includes(item.status);

            return (
              <View style={s.card}>
                <View style={s.cardRow}>
                  <View style={s.cardInfo}>
                    <View style={[s.statusChip, { backgroundColor: colors.bg }]}>
                      <Text style={[s.statusText, { color: colors.text }]}>
                        {STATUS_LABEL[item.status as BookingStatus] ?? item.status}
                      </Text>
                    </View>
                    <View style={s.metaItem}>
                      <Calendar size={14} color="#1e3a8a" />
                      <Text style={s.cardDate}>{fecha}</Text>
                      {item.slot?.time && <Text style={s.cardTime}> · {item.slot.time}</Text>}
                    </View>
                    {item.slot?.location && (
                      <View style={s.metaItem}>
                        <MapPin size={13} color="#9ca3af" />
                        <Text style={s.cardLocation} numberOfLines={1}>{item.slot.location}</Text>
                      </View>
                    )}
                  </View>
                  {canCancel && (
                    <TouchableOpacity
                      style={s.cancelBtn}
                      onPress={() => confirmCancel(item)}
                      disabled={cancelMutation.isPending}
                    >
                      <X size={16} color="#dc2626" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
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
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#1e3a8a' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  tabTextActive: { color: '#1e3a8a' },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 44, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 32 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardInfo: { flex: 1, gap: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardDate: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardTime: { fontSize: 14, color: '#374151' },
  cardLocation: { fontSize: 13, color: '#6b7280', flex: 1 },
  cardMeta: { fontSize: 13, color: '#6b7280' },
  statusChip: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  bookBtn: {
    backgroundColor: '#1e3a8a', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, marginLeft: 12,
  },
  bookBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  cancelBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginLeft: 12,
  },
});
