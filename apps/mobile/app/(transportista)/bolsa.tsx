import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar, Modal,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Weight, Calendar, X, Send } from 'lucide-react-native';
import api, { getApiErrorMessage } from '../../src/lib/api';
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

function QuoteModal({ cargo, onClose, onSuccess }: {
  cargo: Cargo | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!parsed || parsed <= 0) {
      Alert.alert('Error', 'Ingresá un monto válido.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/quotes', { cargoId: cargo!.id, amount: parsed, notes: notes.trim() || undefined });
      Alert.alert('¡Listo!', 'Tu cotización fue enviada.', [{ text: 'OK', onPress: onSuccess }]);
    } catch (e: any) {
      Alert.alert('Error', getApiErrorMessage(e, 'No se pudo enviar la cotización.'));
    } finally {
      setLoading(false);
    }
  }

  if (!cargo) return null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.modalSheet}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Cotizar carga</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X color="#6b7280" size={22} />
            </TouchableOpacity>
          </View>

          <View style={s.modalCargo}>
            <Text style={s.modalCargoType}>{cargo.type}</Text>
            <Text style={s.modalCargoRoute} numberOfLines={2}>
              {formatRouteShort(cargo.originAddress, cargo.destinationAddress)}
            </Text>
            {(cargo.weightTons || cargo.company?.name) ? (
              <Text style={s.modalCargoDetail}>
                {cargo.weightTons ? `${cargo.weightTons} t` : ''}
                {cargo.weightTons && cargo.company?.name ? ' · ' : ''}
                {cargo.company?.name ?? ''}
              </Text>
            ) : null}
          </View>

          <Text style={s.inputLabel}>Tu precio (ARS)</Text>
          <TextInput
            style={s.input}
            placeholder="Ej: 250000"
            placeholderTextColor="#9ca3af"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />

          <Text style={s.inputLabel}>Notas (opcional)</Text>
          <TextInput
            style={[s.input, s.inputMultiline]}
            placeholder="Condiciones, tiempos de entrega, etc."
            placeholderTextColor="#9ca3af"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[s.submitBtn, loading && { opacity: 0.6 }]}
            onPress={submit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Send color="#fff" size={16} />
                <Text style={s.submitText}>Enviar cotización</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function BolsaScreen() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Cargo | null>(null);

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
          const routeShort = formatRouteShort(item.originAddress, item.destinationAddress);
          return (
            <TouchableOpacity
              style={s.card}
              activeOpacity={0.7}
              onPress={() => setSelected(item)}
            >
              {/* Tipo + ofertas */}
              <View style={s.cardTop}>
                <View style={s.typeBadge}>
                  <Text style={s.typeText}>{item.type}</Text>
                </View>
                <View style={s.offerBadge}>
                  <Text style={s.offerText}>
                    {offerCount} oferta{offerCount !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              {/* Ruta simplificada */}
              <Text style={s.routeShort} numberOfLines={2}>{routeShort}</Text>

              {/* Valor del flete: dato más crítico para el camionero */}
              {item.estimatedValue ? (
                <View style={s.valueRow}>
                  <Text style={s.valueLabel}>VALOR REF.</Text>
                  <Text style={s.valueAmount}>
                    ${item.estimatedValue.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </Text>
                </View>
              ) : null}

              {/* Meta secundaria */}
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
                    <Text style={s.date}>
                      {new Date(item.requiredDate).toLocaleDateString('es-AR', {
                        day: '2-digit', month: '2-digit',
                      })}
                    </Text>
                  </View>
                )}
              </View>

              <View style={s.quoteBtn}>
                <Text style={s.quoteBtnText}>Cotizar</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <QuoteModal
        cargo={selected}
        onClose={() => setSelected(null)}
        onSuccess={() => {
          setSelected(null);
          qc.invalidateQueries({ queryKey: ['bolsa-cargas'] });
          qc.invalidateQueries({ queryKey: ['my-quotes'] });
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
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  headerSub: { fontSize: 14, color: '#6B7280', marginTop: 2 },
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
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  typeBadge: { backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  typeText: { fontSize: 12, fontWeight: '700', color: '#1e40af' },
  offerBadge: { backgroundColor: '#DBEAFE', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  offerText: { fontSize: 12, fontWeight: '600', color: '#1E40AF' },

  // Ruta simplificada — jerarquía 2
  routeShort: {
    fontSize: 15, fontWeight: '700', color: '#111827',
    marginBottom: 10, lineHeight: 21,
  },

  // Valor del flete — jerarquía 1
  valueRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 8,
    backgroundColor: '#f0fdf4', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
  },
  valueLabel: { fontSize: 10, fontWeight: '700', color: '#15803d', letterSpacing: 0.8 },
  valueAmount: { fontSize: 20, fontWeight: '800', color: '#15803d', letterSpacing: -0.5 },

  // Meta secundaria
  cardBottom: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6',
    marginBottom: 12,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 12, color: '#9CA3AF' },
  date: { fontSize: 12, color: '#9CA3AF' },

  quoteBtn: {
    backgroundColor: '#15A66A', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  quoteBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 36,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  modalCargo: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 20 },
  modalCargoType: { fontSize: 14, fontWeight: '700', color: '#15803d', marginBottom: 4 },
  modalCargoRoute: { fontSize: 13, color: '#374151', marginBottom: 2 },
  modalCargoDetail: { fontSize: 12, color: '#6b7280' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15,
    color: '#111827', backgroundColor: '#f9fafb', marginBottom: 16,
  },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  submitBtn: {
    backgroundColor: '#15A66A', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 4,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
