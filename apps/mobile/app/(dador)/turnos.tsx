import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar, Modal, ScrollView,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, MapPin, Plus, X, Users } from 'lucide-react-native';
import api, { getApiErrorMessage } from '../../src/lib/api';
import { getUser } from '../../src/lib/auth';

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

const EMPTY_FORM = { plantName: '', address: '', date: '', startTime: '08:00', endTime: '10:00', capacity: '1', notes: '' };

export default function TurnosDadorScreen() {
  const qc = useQueryClient();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [queueSlot, setQueueSlot] = useState<any>(null);

  useEffect(() => {
    getUser().then((u) => setCompanyId(u?.companyId ?? null));
  }, []);

  const { data: slots = [], isLoading, refetch, isRefetching } = useQuery<any[]>({
    queryKey: ['turnos-dador-slots', companyId],
    queryFn: () =>
      api.get('/turnos/slots', { params: { companyId } }).then((r) => r.data?.data ?? r.data ?? []),
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.post('/turnos/slots', {
        plantName: data.plantName.trim(),
        address: data.address.trim(),
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        capacity: parseInt(data.capacity, 10) || 1,
        notes: data.notes.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['turnos-dador-slots'] });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      Alert.alert('¡Listo!', 'Turno creado correctamente.');
    },
    onError: (e: any) => Alert.alert('Error', getApiErrorMessage(e, 'No se pudo crear el turno.')),
  });

  function submitCreate() {
    if (!form.plantName.trim() || !form.address.trim() || !form.date.trim()) {
      Alert.alert('Faltan datos', 'Completá planta, dirección y fecha.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date.trim())) {
      Alert.alert('Fecha inválida', 'Usá el formato AAAA-MM-DD (ej: 2026-06-25).');
      return;
    }
    createMutation.mutate(form);
  }

  const onRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  if (isLoading || !companyId) {
    return <View style={s.centered}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>Turnos</Text>
            <Text style={s.headerSub}>Gestioná los turnos de tu planta</Text>
          </View>
          <TouchableOpacity style={s.newBtn} onPress={() => setShowCreate(true)}>
            <Plus size={18} color="#fff" />
            <Text style={s.newBtnText}>Nuevo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={slots}
        keyExtractor={(item) => item.id}
        contentContainerStyle={slots.length === 0 ? s.emptyContainer : s.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#1e3a8a" />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📅</Text>
            <Text style={s.emptyTitle}>Sin turnos creados</Text>
            <Text style={s.emptySub}>Tocá "Nuevo" para publicar un turno que los transportistas puedan reservar.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const fecha = item.date
            ? new Date(item.date).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' })
            : '—';
          const booked = item._count?.bookings ?? 0;
          const available = item.availableSpots ?? (item.capacity - booked);
          return (
            <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={() => setQueueSlot(item)}>
              <View style={s.cardTop}>
                <Text style={s.plantName}>{item.plantName}</Text>
                <View style={[s.spotsBadge, available > 0 ? s.spotsOk : s.spotsFull]}>
                  <Text style={[s.spotsText, { color: available > 0 ? '#166534' : '#991b1b' }]}>
                    {available > 0 ? `${available} libre${available !== 1 ? 's' : ''}` : 'Completo'}
                  </Text>
                </View>
              </View>
              <View style={s.metaItem}>
                <Calendar size={14} color="#1e3a8a" />
                <Text style={s.cardDate}>{fecha}</Text>
                <Text style={s.cardTime}> · {item.startTime}–{item.endTime}</Text>
              </View>
              {item.address && (
                <View style={s.metaItem}>
                  <MapPin size={13} color="#9ca3af" />
                  <Text style={s.cardLocation} numberOfLines={1}>{item.address}</Text>
                </View>
              )}
              <View style={s.cardBottom}>
                <View style={s.metaItem}>
                  <Users size={13} color="#6b7280" />
                  <Text style={s.cardMeta}>{booked}/{item.capacity} reservado{booked !== 1 ? 's' : ''}</Text>
                </View>
                <Text style={s.viewQueue}>Ver cola →</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Modal crear turno */}
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalRoot}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Nuevo turno</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}><X size={22} color="#6b7280" /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
              <Field label="Planta / acopio">
                <TextInput style={s.input} value={form.plantName} onChangeText={(v) => setForm({ ...form, plantName: v })} placeholder="Ej: Planta Norte" />
              </Field>
              <Field label="Dirección">
                <TextInput style={s.input} value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} placeholder="Ej: Ruta 9 km 120, Córdoba" />
              </Field>
              <Field label="Fecha (AAAA-MM-DD)">
                <TextInput style={s.input} value={form.date} onChangeText={(v) => setForm({ ...form, date: v })} placeholder="2026-06-25" keyboardType="numbers-and-punctuation" />
              </Field>
              <View style={s.row}>
                <Field label="Desde" flex>
                  <TextInput style={s.input} value={form.startTime} onChangeText={(v) => setForm({ ...form, startTime: v })} placeholder="08:00" />
                </Field>
                <Field label="Hasta" flex>
                  <TextInput style={s.input} value={form.endTime} onChangeText={(v) => setForm({ ...form, endTime: v })} placeholder="10:00" />
                </Field>
                <Field label="Cupo" flex>
                  <TextInput style={s.input} value={form.capacity} onChangeText={(v) => setForm({ ...form, capacity: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad" placeholder="1" />
                </Field>
              </View>
              <Field label="Notas (opcional)">
                <TextInput style={[s.input, { height: 70 }]} value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} multiline placeholder="Indicaciones para el chofer..." />
              </Field>
            </ScrollView>
            <TouchableOpacity
              style={[s.submitBtn, createMutation.isPending && { opacity: 0.6 }]}
              onPress={submitCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.submitText}>Crear turno</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal cola del turno */}
      <QueueModal slot={queueSlot} onClose={() => setQueueSlot(null)} />
    </View>
  );
}

function QueueModal({ slot, onClose }: { slot: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['turno-queue', slot?.id],
    queryFn: () => api.get(`/turnos/slots/${slot.id}/queue`).then((r) => r.data),
    enabled: !!slot,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'attend' | 'complete' }) =>
      api.patch(`/turnos/bookings/${id}/${action}`),
    onSuccess: () => {
      refetch();
      qc.invalidateQueries({ queryKey: ['turnos-dador-slots'] });
    },
    onError: (e: any) => Alert.alert('Error', getApiErrorMessage(e, 'No se pudo actualizar.')),
  });

  const bookings: any[] = data?.bookings ?? [];

  return (
    <Modal visible={!!slot} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalRoot}>
        <View style={[s.modalCard, { maxHeight: '80%' }]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Cola · {slot?.plantName}</Text>
            <TouchableOpacity onPress={onClose}><X size={22} color="#6b7280" /></TouchableOpacity>
          </View>
          {isLoading ? (
            <ActivityIndicator size="large" color="#1e3a8a" style={{ marginVertical: 32 }} />
          ) : bookings.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🚛</Text>
              <Text style={s.emptyTitle}>Sin reservas aún</Text>
              <Text style={s.emptySub}>Cuando un transportista reserve, aparecerá acá.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
              {bookings.map((b, idx) => {
                const colors = STATUS_COLOR[b.status as BookingStatus] ?? STATUS_COLOR.CONFIRMADO;
                return (
                  <View key={b.id} style={s.queueCard}>
                    <View style={s.queueTop}>
                      <View style={s.queuePos}><Text style={s.queuePosText}>{idx + 1}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.queueCompany}>{b.company?.name ?? 'Transportista'}</Text>
                        {(b.vehiclePlate || b.driverName) && (
                          <Text style={s.queueMeta}>
                            {[b.vehiclePlate, b.driverName].filter(Boolean).join(' · ')}
                          </Text>
                        )}
                      </View>
                      <View style={[s.statusChip, { backgroundColor: colors.bg }]}>
                        <Text style={[s.statusText, { color: colors.text }]}>
                          {STATUS_LABEL[b.status as BookingStatus] ?? b.status}
                        </Text>
                      </View>
                    </View>
                    {!['COMPLETADO', 'CANCELADO'].includes(b.status) && (
                      <View style={s.queueActions}>
                        {b.status !== 'EN_ATENCION' && (
                          <TouchableOpacity
                            style={[s.qBtn, s.qBtnAttend]}
                            onPress={() => actionMutation.mutate({ id: b.id, action: 'attend' })}
                            disabled={actionMutation.isPending}
                          >
                            <Text style={s.qBtnAttendText}>Atender</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[s.qBtn, s.qBtnComplete]}
                          onPress={() => actionMutation.mutate({ id: b.id, action: 'complete' })}
                          disabled={actionMutation.isPending}
                        >
                          <Text style={s.qBtnCompleteText}>Completar</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: boolean }) {
  return (
    <View style={flex ? { flex: 1 } : undefined}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1e3a8a' },
  headerSub: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1e3a8a', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
  },
  newBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 44, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 32 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 6,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  plantName: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  spotsBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  spotsOk: { backgroundColor: '#dcfce7' },
  spotsFull: { backgroundColor: '#fee2e2' },
  spotsText: { fontSize: 12, fontWeight: '700' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardDate: { fontSize: 14, fontWeight: '600', color: '#111827' },
  cardTime: { fontSize: 14, color: '#374151' },
  cardLocation: { fontSize: 13, color: '#6b7280', flex: 1 },
  cardBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 10, marginTop: 4, borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  cardMeta: { fontSize: 13, color: '#6b7280' },
  viewQueue: { fontSize: 13, fontWeight: '600', color: '#1e3a8a' },

  // Modal
  modalRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 32,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6 },
  input: {
    backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 15, color: '#111827',
  },
  row: { flexDirection: 'row', gap: 10 },
  submitBtn: {
    backgroundColor: '#1e3a8a', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 8,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Queue
  queueCard: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, gap: 10 },
  queueTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  queuePos: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#1e3a8a', alignItems: 'center', justifyContent: 'center' },
  queuePosText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  queueCompany: { fontSize: 14, fontWeight: '700', color: '#111827' },
  queueMeta: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  statusChip: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  queueActions: { flexDirection: 'row', gap: 8 },
  qBtn: { flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  qBtnAttend: { backgroundColor: '#dbeafe' },
  qBtnAttendText: { color: '#1e40af', fontSize: 13, fontWeight: '700' },
  qBtnComplete: { backgroundColor: '#1e3a8a' },
  qBtnCompleteText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
