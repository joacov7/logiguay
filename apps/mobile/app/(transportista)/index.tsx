import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { getUser } from '../../src/lib/auth';
import { KpiCard } from '../../src/components/ui';
import { User } from '../../src/lib/types';

const ACTIVE_TRIP_STATUSES = 'ASIGNADO,EN_CAMINO_ORIGEN,EN_CARGA,EN_TRANSITO,EN_DESCARGA';

export default function TransportistaDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  const { data: tripsData, isLoading: loadingTrips, refetch: refetchTrips } = useQuery({
    queryKey: ['transportista-trips', refreshKey],
    queryFn: () =>
      api.get('/trips', { params: { status: ACTIVE_TRIP_STATUSES, limit: 100 } }).then((r) => r.data),
  });

  const { data: vehiclesData, isLoading: loadingVehicles, refetch: refetchVehicles } = useQuery({
    queryKey: ['transportista-vehicles', refreshKey],
    queryFn: () =>
      api.get('/vehicles', { params: { status: 'ACTIVO', limit: 100 } }).then((r) => r.data),
  });

  const trips: any[] = tripsData?.data ?? tripsData ?? [];
  const vehicles: any[] = vehiclesData?.data ?? vehiclesData ?? [];

  const activeTrips = trips.length;
  const inTransit = trips.filter((t: any) => t.status === 'EN_TRANSITO').length;
  const availableTrucks = vehicles.length;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchTrips(), refetchVehicles()]);
    setRefreshing(false);
  }, [refetchTrips, refetchVehicles]);

  const loading = loadingTrips || loadingVehicles;

  if (loading && !refreshing) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#15A66A" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#15A66A" />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.greeting}>
            Buenos días{user?.firstName ? `, ${user.firstName}` : ''}
          </Text>
          {user?.companyId && (
            <Text style={s.company}>Tu empresa transportista</Text>
          )}
        </View>

        {/* KPI Grid */}
        <Text style={s.sectionTitle}>Resumen</Text>
        <View style={s.kpiGrid}>
          <KpiCard title="Viajes activos" value={activeTrips} icon="🚛" />
          <KpiCard title="En tránsito" value={inTransit} icon="🛣️" color="#3B82F6" />
        </View>
        <View style={s.kpiGrid}>
          <KpiCard title="Camiones disp." value={availableTrucks} icon="🚚" color="#F59E0B" />
          <KpiCard title="Cargas disp." value="Ver bolsa" icon="📦" color="#8B5CF6" />
        </View>

        {/* Quick actions */}
        <Text style={s.sectionTitle}>Acciones rápidas</Text>
        <View style={s.actionsRow}>
          <TouchableOpacity
            style={s.actionBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/(transportista)/viajes')}
          >
            <Text style={s.actionIcon}>🚛</Text>
            <Text style={s.actionText}>Ver viajes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, s.actionBtnSecondary]}
            activeOpacity={0.7}
            onPress={() => router.push('/(transportista)/bolsa')}
          >
            <Text style={s.actionIcon}>📦</Text>
            <Text style={[s.actionText, s.actionTextSecondary]}>Buscar cargas</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 32 },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 20,
  },
  greeting: { fontSize: 24, fontWeight: '800', color: '#111827' },
  company: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#15A66A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
    minHeight: 80,
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  actionBtnSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#15A66A',
  },
  actionIcon: { fontSize: 24 },
  actionText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  actionTextSecondary: { color: '#15A66A' },
});
