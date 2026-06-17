import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar, Alert, TextInput, Modal,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';
import { T } from '../../src/lib/theme';

type BookingStatus = 'CONFIRMADO' | 'EN_ESPERA' | 'EN_ATENCION' | 'DEMORADO' | 'COMPLETADO' | 'CANCELADO';

const STATUS_COLOR: Record<BookingStatus, string> = {
  CONFIRMADO:  T.textMuted,
  EN_ESPERA:   '#C47B00',
  EN_ATENCION: T.accent,
  DEMORADO:    T.statusDanger,
  COMPLETADO:  T.accent,
  CANCELADO:   T.textMuted,
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  CONFIRMADO:  'Confirmado',
  EN_ESPERA:   'En espera',
  EN_ATENCION: 'En atención',
  DEMORADO:    'Demorado',
  COMPLETADO:  'Completado',
  CANCELADO:   'Cancelado',
};

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[s.chip, { borderColor: color }]}>
      <Text style={[s.chipText, { color }]}>{label}</Text>
    </View>
  );
}

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

export default function TurnosScreen() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'disponibles' | 'misreservas'>('disponibles');
  const [bookModal, setBookModal] = useState<any>(null);
  const [driverName, setDriverName] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [delayModal, setDelayModal] = useState<any>(null);
  const [delayMinutes, setDelayMinutes] = useState('30');
  const [delayNote, setDelayNote] = useState('');

  const { data: slots = [], isLoading: loadingSlots, refetch: refetchSlots, isRefetching: refetchingSlots } = useQuery({
    queryKey: ['turnos-slots'],
    queryFn: () => api.get('/turnos/slots').then(r => r.data),
    enabled: tab === 'disponibles',
  });

  const { data: bookings = [], isLoading: loadingBookings, refetch: refetchBookings, isRefetching: refetchingBookings } = useQuery({
    queryKey: ['turnos-my-bookings'],
    queryFn: () => api.get('/turnos/my-bookings').then(r => r.data),
    enabled: tab === 'misreservas',
  });

  const bookMutation = useMutation({
    mutationFn: (slotId: string) =>
      api.post(`/turnos/slots/${slotId}/book`, { driverName, vehiclePlate }),
    onSuccess: () => {
      setBookModal(null);
      setDriverName('');
      setVehiclePlate('');
      qc.invalidateQueries({ queryKey: ['turnos-slots'] });
      qc.invalidateQueries({ queryKey: ['turnos-my-bookings'] });
      Alert.alert('Reservado', 'Tu turno fue reservado correctamente.');
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo reservar'),
  });

  const checkInMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/turnos/bookings/${id}/checkin`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['turnos-my-bookings'] }),
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Error'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/turnos/bookings/${id}/cancel`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['turnos-my-bookings'] });
      qc.invalidateQueries({ queryKey: ['turnos-slots'] });
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Error'),
  });

  const delayMutation = useMutation({
    mutationFn: ({ id, minutes, note }: { id: string; minutes: number; note: string }) =>
      api.patch(`/turnos/bookings/${id}/delay`, { delayMinutes: minutes, delayNote: note }),
    onSuccess: () => {
      setDelayModal(null);
      qc.invalidateQueries({ queryKey: ['turnos-my-bookings'] });
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Error'),
  });

  const renderSlot = useCallback(({ item }: any) => {
    const full = item.availableSpots <= 0;
    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          <Text style={s.plantName} numberOfLines={1}>{item.plantName}</Text>
          <Chip
            label={full ? 'Completo' : `${item.availableSpots} lugar${item.availableSpots !== 1 ? 'es' : ''}`}
            color={full ? T.statusDanger : T.accent}
          />
        </View>
        <Text style={s.cardMeta}>{item.company?.name}</Text>
        <View style={s.infoRow}>
          <Ionicons name="calendar-outline" size={13} color={T.textMuted} />
          <Text style={s.infoText}>{new Date(item.date).toLocaleDateString('es-AR')}</Text>
          <Ionicons name="time-outline" size={13} color={T.textMuted} style={{ marginLeft: 10 }} />
          <Text style={s.infoText}>{item.startTime} – {item.endTime}</Text>
        </View>
        <View style={s.infoRow}>
          <Ionicons name="location-outline" size={13} color={T.textMuted} />
          <Text style={s.infoText} numberOfLines={1}>{item.address}</Text>
        </View>
        {item.notes ? <Text style={s.notes}>{item.notes}</Text> : null}
        <TouchableOpacity
          style={[s.bookBtn, full && s.bookBtnDisabled]}
          disabled={full}
          activeOpacity={0.8}
          onPress={() => { setBookModal(item); setDriverName(''); setVehiclePlate(''); }}
        >
          <Text style={s.bookBtnText}>{full ? 'Sin lugares' : 'Reservar turno'}</Text>
        </TouchableOpacity>
      </View>
    );
  }, []);

  const renderBooking = useCallback(({ item }: any) => {
    const status = item.status as BookingStatus;
    const today = item.slot?.date ? isToday(item.slot.date) : false;
    const canCheckin = today && (status === 'CONFIRMADO' || status === 'DEMORADO');
    const canDelay = status === 'CONFIRMADO' || status === 'EN_ESPERA';
    const canCancel = status === 'CONFIRMADO';
    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          <Text style={s.plantName} numberOfLines={1}>{item.slot?.plantName}</Text>
          <Chip label={STATUS_LABEL[status]} color={STATUS_COLOR[status]} />
        </View>
        <Text style={s.cardMeta}>{item.slot?.company?.name}</Text>
        <View style={s.infoRow}>
          <Ionicons name="calendar-outline" size={13} color={T.textMuted} />
          <Text style={s.infoText}>{item.slot?.date ? new Date(item.slot.date).toLocaleDateString('es-AR') : '—'}</Text>
          <Ionicons name="time-outline" size={13} color={T.textMuted} style={{ marginLeft: 10 }} />
          <Text style={s.infoText}>{item.slot?.startTime} – {item.slot?.endTime}</Text>
        </View>
        {(item.driverName || item.vehiclePlate) && (
          <View style={s.infoRow}>
            <Ionicons name="person-outline" size={13} color={T.textMuted} />
            <Text style={s.infoText}>{[item.driverName, item.vehiclePlate].filter(Boolean).join(' · ')}</Text>
          </View>
        )}
        {item.delayMinutes ? (
          <Text style={s.delayNote}>⚠ Demora reportada: ~{item.delayMinutes} min{item.delayNote ? ` — ${item.delayNote}` : ''}</Text>
        ) : null}
        {(canCheckin || canDelay || canCancel) && (
          <View style={s.actions}>
            {canCheckin && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: T.accent }]}
                onPress={() => checkInMutation.mutate(item.id)}
              >
                <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
                <Text style={s.actionBtnText}>Llegué</Text>
              </TouchableOpacity>
            )}
            {canDelay && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#C47B00' }]}
                onPress={() => { setDelayModal(item); setDelayMinutes('30'); setDelayNote(''); }}
              >
                <Ionicons name="time-outline" size={15} color="#fff" />
                <Text style={s.actionBtnText}>Me demoro</Text>
              </TouchableOpacity>
            )}
            {canCancel && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: T.statusDanger }]}
                onPress={() => Alert.alert('Cancelar reserva', '¿Cancelás esta reserva?', [
                  { text: 'No', style: 'cancel' },
                  { text: 'Sí, cancelar', style: 'destructive', onPress: () => cancelMutation.mutate(item.id) },
                ])}
              >
                <Ionicons name="close-circle-outline" size={15} color="#fff" />
                <Text style={s.actionBtnText}>Cancelar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }, [checkInMutation, cancelMutation]);

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bgCard} />

      <View style={s.header}>
        <Text style={s.headerTitle}>Turnos</Text>
        <View style={s.tabs}>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'disponibles' && s.tabBtnActive]}
            onPress={() => setTab('disponibles')}
          >
            <Text style={[s.tabBtnText, tab === 'disponibles' && s.tabBtnTextActive]}>Disponibles</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'misreservas' && s.tabBtnActive]}
            onPress={() => setTab('misreservas')}
          >
            <Text style={[s.tabBtnText, tab === 'misreservas' && s.tabBtnTextActive]}>Mis reservas</Text>
          </TouchableOpacity>
        </View>
      </View>

      {tab === 'disponibles' ? (
        loadingSlots ? (
          <View style={s.centered}><ActivityIndicator color={T.accent} size="large" /></View>
        ) : (
          <FlatList
            data={slots}
            keyExtractor={i => i.id}
            contentContainerStyle={slots.length === 0 ? s.emptyContainer : s.list}
            refreshControl={<RefreshControl refreshing={refetchingSlots} onRefresh={refetchSlots} tintColor={T.accent} />}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyIcon}>📅</Text>
                <Text style={s.emptyTitle}>Sin turnos disponibles</Text>
                <Text style={s.emptySub}>No hay turnos publicados por ahora.</Text>
              </View>
            }
            renderItem={renderSlot}
          />
        )
      ) : (
        loadingBookings ? (
          <View style={s.centered}><ActivityIndicator color={T.accent} size="large" /></View>
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={i => i.id}
            contentContainerStyle={bookings.length === 0 ? s.emptyContainer : s.list}
            refreshControl={<RefreshControl refreshing={refetchingBookings} onRefresh={refetchBookings} tintColor={T.accent} />}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyIcon}>🗓</Text>
                <Text style={s.emptyTitle}>Sin reservas</Text>
                <Text style={s.emptySub}>Reservá un turno desde "Disponibles".</Text>
              </View>
            }
            renderItem={renderBooking}
          />
        )
      )}

      {/* Modal — reservar */}
      <Modal visible={!!bookModal} transparent animationType="slide" onRequestClose={() => setBookModal(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Reservar turno</Text>
            {bookModal && (
              <Text style={s.modalSub}>{bookModal.plantName} · {bookModal.startTime} – {bookModal.endTime}</Text>
            )}
            <Text style={s.fieldLabel}>Conductor</Text>
            <TextInput
              style={s.input}
              value={driverName}
              onChangeText={setDriverName}
              placeholder="Nombre del conductor"
              placeholderTextColor={T.textMuted}
            />
            <Text style={s.fieldLabel}>Patente</Text>
            <TextInput
              style={s.input}
              value={vehiclePlate}
              onChangeText={setVehiclePlate}
              placeholder="Ej: ABC123"
              autoCapitalize="characters"
              placeholderTextColor={T.textMuted}
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setBookModal(null)}>
                <Text style={s.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalConfirmBtn, bookMutation.isPending && { opacity: 0.6 }]}
                disabled={bookMutation.isPending}
                onPress={() => bookModal && bookMutation.mutate(bookModal.id)}
              >
                {bookMutation.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.modalConfirmText}>Confirmar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal — demora */}
      <Modal visible={!!delayModal} transparent animationType="slide" onRequestClose={() => setDelayModal(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Reportar demora</Text>
            <Text style={s.fieldLabel}>Minutos de demora estimados</Text>
            <TextInput
              style={s.input}
              value={delayMinutes}
              onChangeText={setDelayMinutes}
              keyboardType="number-pad"
              placeholderTextColor={T.textMuted}
            />
            <Text style={s.fieldLabel}>Motivo (opcional)</Text>
            <TextInput
              style={s.input}
              value={delayNote}
              onChangeText={setDelayNote}
              placeholder="Ej: Tráfico en ruta 9"
              placeholderTextColor={T.textMuted}
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setDelayModal(null)}>
                <Text style={s.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalConfirmBtn, { backgroundColor: '#C47B00' }, delayMutation.isPending && { opacity: 0.6 }]}
                disabled={delayMutation.isPending}
                onPress={() => delayModal && delayMutation.mutate({
                  id: delayModal.id,
                  minutes: Number(delayMinutes) || 30,
                  note: delayNote,
                })}
              >
                {delayMutation.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.modalConfirmText}>Avisar demora</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bgApp },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: T.bgCard,
    paddingTop: 56,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  headerTitle: {
    fontSize: T.fontSizeXl, fontWeight: '800', color: T.textPrimary,
    paddingHorizontal: T.spaceMd, marginBottom: 12,
  },
  tabs: { flexDirection: 'row', paddingHorizontal: T.spaceMd },
  tabBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: T.textPrimary },
  tabBtnText: { fontSize: T.fontSizeSm, fontWeight: '600', color: T.textMuted },
  tabBtnTextActive: { color: T.textPrimary },
  list: { padding: T.spaceMd, gap: 12 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: T.fontSizeLg, fontWeight: '700', color: T.textPrimary, marginBottom: 6 },
  emptySub: { fontSize: T.fontSizeSm, color: T.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  card: {
    backgroundColor: T.bgCard, borderWidth: 1, borderColor: T.border,
    borderRadius: T.radius, padding: T.spaceMd, gap: 6,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plantName: { fontSize: T.fontSizeMd, fontWeight: '700', color: T.textPrimary, flex: 1, marginRight: 8 },
  cardMeta: { fontSize: T.fontSizeXs, color: T.textMuted },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: T.fontSizeXs, color: T.textSecondary },
  notes: { fontSize: T.fontSizeXs, color: T.textMuted, fontStyle: 'italic' },
  delayNote: { fontSize: T.fontSizeXs, color: T.statusDanger, fontWeight: '600' },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  chipText: { fontSize: 11, fontWeight: '700' },
  bookBtn: {
    backgroundColor: T.textPrimary, borderRadius: T.radius,
    paddingVertical: 12, alignItems: 'center', marginTop: 4,
  },
  bookBtnDisabled: { backgroundColor: T.border },
  bookBtnText: { color: '#fff', fontSize: T.fontSizeSm, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, borderRadius: T.radiusSm, paddingVertical: 9,
  },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: T.bgCard, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: T.spaceMd, paddingBottom: 36, gap: 4,
  },
  modalTitle: { fontSize: T.fontSizeLg, fontWeight: '800', color: T.textPrimary, marginBottom: 2 },
  modalSub: { fontSize: T.fontSizeSm, color: T.textMuted, marginBottom: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: T.textMuted, marginTop: 10 },
  input: {
    borderWidth: 1, borderColor: T.border, borderRadius: T.radiusSm,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: T.fontSizeMd,
    color: T.textPrimary, backgroundColor: T.bgMuted, marginTop: 4,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancelBtn: {
    flex: 1, borderWidth: 1, borderColor: T.border, borderRadius: T.radiusSm,
    paddingVertical: 13, alignItems: 'center',
  },
  modalCancelText: { fontSize: T.fontSizeSm, fontWeight: '600', color: T.textSecondary },
  modalConfirmBtn: {
    flex: 1, backgroundColor: T.textPrimary, borderRadius: T.radiusSm,
    paddingVertical: 13, alignItems: 'center',
  },
  modalConfirmText: { color: '#fff', fontSize: T.fontSizeSm, fontWeight: '700' },
});
