import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar, Modal,
  TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { MapPin, Weight, Calendar, X, Send } from 'lucide-react-native';
import api, { getApiErrorMessage } from '../../src/lib/api';
import { formatRouteShort } from '../../src/lib/formatAddress';

interface Cargo {
  id: string;
  type: string;
  description?: string;
  originAddress: string;
  destinationAddress: string;
  weightTons?: number;
  estimatedValue?: number;
  requiredDate?: string;
  company: { name: string };
  _count?: { quotes: number };
}

interface QuoteModalProps {
  cargo: Cargo | null;
  onClose: () => void;
  onSuccess: () => void;
}

function QuoteModal({ cargo, onClose, onSuccess }: QuoteModalProps) {
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
      Alert.alert('¡Listo!', 'Tu cotización fue enviada.', [
        { text: 'OK', onPress: onSuccess },
      ]);
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
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cotizar carga</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X color="#6b7280" size={22} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalCargo}>
            <Text style={styles.modalCargoType}>{cargo.type}</Text>
            <Text style={styles.modalCargoRoute} numberOfLines={2}>
              {formatRouteShort(cargo.originAddress, cargo.destinationAddress)}
            </Text>
            <Text style={styles.modalCargoDetail}>
              {cargo.weightTons ? `${cargo.weightTons} t · ` : ''}{cargo.company.name}
            </Text>
          </View>

          <Text style={styles.inputLabel}>Tu precio (ARS)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 250000"
            placeholderTextColor="#9ca3af"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />

          <Text style={styles.inputLabel}>Notas (opcional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Condiciones, tiempos de entrega, etc."
            placeholderTextColor="#9ca3af"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.6 }]}
            onPress={submit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Send color="#fff" size={16} />
                <Text style={styles.submitText}>Enviar cotización</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CargoCard({ cargo, onQuote }: { cargo: Cargo; onQuote: () => void }) {
  const date = cargo.requiredDate
    ? new Date(cargo.requiredDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
    : null;
  const routeShort = formatRouteShort(cargo.originAddress, cargo.destinationAddress);

  return (
    <View style={styles.card}>
      {/* Fila superior: tipo + fecha */}
      <View style={styles.cardTop}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{cargo.type}</Text>
        </View>
        {date && (
          <View style={styles.dateChip}>
            <Calendar color="#6b7280" size={11} />
            <Text style={styles.dateText}>{date}</Text>
          </View>
        )}
      </View>

      {/* Ruta simplificada — dato más visual y escaneable */}
      <Text style={styles.routeShort} numberOfLines={2}>{routeShort}</Text>

      {/* Valor del flete: dato crítico para el camionero, máxima jerarquía */}
      {cargo.estimatedValue ? (
        <View style={styles.valueRow}>
          <Text style={styles.valueLabel}>VALOR REF.</Text>
          <Text style={styles.valueAmount}>
            ${cargo.estimatedValue.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Text>
        </View>
      ) : null}

      {/* Meta secundaria: peso + empresa */}
      <View style={styles.cardMeta}>
        {cargo.weightTons ? (
          <View style={styles.metaItem}>
            <Weight color="#9ca3af" size={12} />
            <Text style={styles.metaText}>{cargo.weightTons} t</Text>
          </View>
        ) : null}
        <Text style={styles.companyText} numberOfLines={1}>{cargo.company.name}</Text>
      </View>

      <TouchableOpacity style={styles.quoteBtn} onPress={onQuote} activeOpacity={0.8}>
        <Text style={styles.quoteBtnText}>Cotizar</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function BolsaScreen() {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Cargo | null>(null);

  async function fetchCargos() {
    try {
      const res = await api.get('/cargo/marketplace');
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setCargos(data);
      setError(null);
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Error al cargar la bolsa.'));
    }
  }

  useEffect(() => {
    fetchCargos().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCargos();
    setRefreshing(false);
  }, []);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bolsa de trabajo</Text>
        <Text style={styles.headerSub}>{cargos.length} carga{cargos.length !== 1 ? 's' : ''} disponible{cargos.length !== 1 ? 's' : ''}</Text>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={cargos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={cargos.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1e3a8a" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>Sin cargas disponibles</Text>
            <Text style={styles.emptySubtitle}>Deslizá para actualizar.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <CargoCard cargo={item} onQuote={() => setSelected(item)} />
        )}
      />

      <QuoteModal
        cargo={selected}
        onClose={() => setSelected(null)}
        onSuccess={() => { setSelected(null); fetchCargos(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#fff', paddingHorizontal: 20,
    paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1e3a8a' },
  headerSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  errorBanner: { backgroundColor: '#fef2f2', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#fecaca' },
  errorText: { color: '#dc2626', fontSize: 14 },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#9ca3af' },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6, elevation: 3,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeBadge: { backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  typeText: { fontSize: 12, fontWeight: '700', color: '#1e40af' },
  dateChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, color: '#6b7280' },

  // Ruta simplificada — jerarquía 2
  routeShort: {
    fontSize: 15, fontWeight: '700', color: '#111827',
    marginBottom: 10, lineHeight: 21,
  },

  // Valor del flete — jerarquía 1: el dato más importante para el camionero
  valueRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 8,
    backgroundColor: '#f0fdf4', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 10,
  },
  valueLabel: {
    fontSize: 10, fontWeight: '700', color: '#15803d', letterSpacing: 0.8,
  },
  valueAmount: {
    fontSize: 20, fontWeight: '800', color: '#15803d', letterSpacing: -0.5,
  },

  // Meta secundaria
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, color: '#9ca3af' },
  companyText: { fontSize: 12, color: '#9ca3af', marginLeft: 'auto', flex: 1, textAlign: 'right' },

  quoteBtn: {
    backgroundColor: '#1e3a8a', borderRadius: 10,
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
  modalCargoType: { fontSize: 14, fontWeight: '700', color: '#1e3a8a', marginBottom: 4 },
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
    backgroundColor: '#1e3a8a', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 4,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
