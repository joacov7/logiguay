import { useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import api from '../../src/lib/api';

interface Vehicle {
  id: string;
  plate: string;
  type: string;
  brand: string;
  model: string;
  capacityTons: number | null;
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  ACTIVO:       { label: 'Activo',        bg: '#DCFCE7', text: '#15803D' },
  INACTIVO:     { label: 'Inactivo',      bg: '#F3F4F6', text: '#6B7280' },
  MANTENIMIENTO:{ label: 'Mantenimiento', bg: '#FEF9C3', text: '#854D0E' },
};

export default function FlotaScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['transportista-flota'],
    queryFn: () => api.get('/vehicles', { params: { limit: 100 } }).then((r) => r.data),
  });

  const vehicles: Vehicle[] = data?.data ?? data ?? [];

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
        <Text style={s.headerTitle}>Mi flota</Text>
        <Text style={s.headerSub}>{vehicles.length} vehículo{vehicles.length !== 1 ? 's' : ''}</Text>
      </View>
      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={vehicles.length === 0 ? s.emptyContainer : s.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#15A66A" />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🚚</Text>
            <Text style={s.emptyTitle}>Sin vehículos registrados</Text>
            <Text style={s.emptySub}>Agregá vehículos desde el panel web</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusCfg = STATUS_CONFIG[item.status] ?? {
            label: item.status,
            bg: '#F3F4F6',
            text: '#6B7280',
          };
          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={s.plateWrap}>
                  <Text style={s.plate}>{item.plate}</Text>
                </View>
                <View style={[s.typeBadge]}>
                  <Text style={s.typeText}>{item.type}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: statusCfg.bg }]}>
                  <Text style={[s.statusText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
                </View>
              </View>
              <Text style={s.brandModel}>
                {item.brand} {item.model}
              </Text>
              {item.capacityTons != null && (
                <Text style={s.capacity}>Capacidad: {item.capacityTons} t</Text>
              )}
            </View>
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
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  headerSub: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  plateWrap: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  plate: { fontFamily: 'monospace', fontSize: 15, fontWeight: '700', color: '#111827' },
  typeBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  typeText: { fontSize: 12, fontWeight: '600', color: '#4F46E5' },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 'auto',
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  brandModel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  capacity: { fontSize: 13, color: '#6B7280', marginTop: 4 },
});
