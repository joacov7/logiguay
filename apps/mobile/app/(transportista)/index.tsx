import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';
import { getUser } from '../../src/lib/auth';
import { T } from '../../src/lib/theme';
import { User } from '../../src/lib/types';

const ACTIVE_TRIP_STATUSES = 'ASIGNADO,EN_CAMINO_ORIGEN,EN_CARGA,EN_TRANSITO,EN_DESCARGA';

function StatBlock({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <View style={[st.statBlock, accent && st.statBlockAccent]}>
      <Text style={[st.statValue, accent && st.statValueAccent]}>{value}</Text>
      <Text style={[st.statLabel, accent && st.statLabelAccent]}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress, secondary }: {
  icon: string; label: string; onPress: () => void; secondary?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[st.quickBtn, secondary && st.quickBtnSecondary]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon as any} size={22} color={secondary ? T.textSecondary : '#fff'} />
      <Text style={[st.quickLabel, secondary && st.quickLabelSecondary]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function TransportistaDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { getUser().then(setUser); }, []);

  const { data: tripsData, isLoading: loadingTrips, refetch: refetchTrips } = useQuery({
    queryKey: ['transportista-trips', refreshKey],
    queryFn: () => api.get('/trips', { params: { status: ACTIVE_TRIP_STATUSES, limit: 100 } }).then((r) => r.data),
  });

  const { data: vehiclesData, isLoading: loadingVehicles, refetch: refetchVehicles } = useQuery({
    queryKey: ['transportista-vehicles', refreshKey],
    queryFn: () => api.get('/vehicles', { params: { limit: 100 } }).then((r) => r.data),
  });

  const trips: any[] = tripsData?.data ?? tripsData ?? [];
  const vehicles: any[] = vehiclesData?.data ?? vehiclesData ?? [];

  const activeTrips = trips.length;
  const inTransit = trips.filter((t: any) => t.status === 'EN_TRANSITO').length;
  const availableVehicles = vehicles.length;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchTrips(), refetchVehicles()]);
    setRefreshing(false);
  }, [refetchTrips, refetchVehicles]);

  const loading = loadingTrips || loadingVehicles;

  if (loading && !refreshing) {
    return (
      <View style={st.centered}>
        <ActivityIndicator size="large" color={T.accent} />
      </View>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <View style={st.container}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bgHeader} />

      {/* Header */}
      <View style={st.header}>
        <View>
          <Text style={st.greeting}>{greeting}{user?.firstName ? `, ${user.firstName}` : ''}</Text>
          <Text style={st.subGreeting}>Panel del transportista</Text>
        </View>
      </View>

      <ScrollView
        style={st.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />}
      >

        {/* Stats */}
        <View style={st.statsRow}>
          <StatBlock label="Viajes activos" value={activeTrips} accent />
          <StatBlock label="En tránsito" value={inTransit} />
          <StatBlock label="Vehículos" value={availableVehicles} />
        </View>

        {/* Acciones rápidas */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>ACCIONES RÁPIDAS</Text>
          <View style={st.quickGrid}>
            <QuickAction icon="car-outline" label="Ver viajes" onPress={() => router.push('/(transportista)/viajes')} />
            <QuickAction icon="cube-outline" label="Buscar cargas" onPress={() => router.push('/(transportista)/bolsa')} secondary />
          </View>
          <View style={st.quickGrid}>
            <QuickAction icon="map-outline" label="Mapa de flota" onPress={() => router.push('/(transportista)/mapa')} secondary />
            <QuickAction icon="bus-outline" label="Mi flota" onPress={() => router.push('/(transportista)/flota')} secondary />
          </View>
        </View>

        {/* Viajes recientes */}
        {trips.length > 0 && (
          <View style={st.section}>
            <Text style={st.sectionTitle}>VIAJES EN CURSO</Text>
            <View style={st.card}>
              {trips.slice(0, 5).map((trip: any, i: number) => (
                <TouchableOpacity
                  key={trip.id}
                  style={[st.tripRow, i < Math.min(trips.length, 5) - 1 && st.tripRowBorder]}
                  onPress={() => router.push(`/trip/${trip.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={st.tripLeft}>
                    <Text style={st.tripPlate}>{trip.vehicle?.plate ?? '—'}</Text>
                    <Text style={st.tripRoute} numberOfLines={1}>
                      {trip.cargo?.originAddress?.split(',')[0] ?? '—'} → {trip.cargo?.destinationAddress?.split(',')[0] ?? '—'}
                    </Text>
                  </View>
                  <View style={st.tripRight}>
                    <Text style={st.tripStatus}>{trip.status?.replace(/_/g, ' ') ?? '—'}</Text>
                    <Ionicons name="chevron-forward" size={14} color={T.textMuted} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bgApp },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },

  header: {
    backgroundColor: T.bgHeader, paddingHorizontal: T.spaceMd,
    paddingTop: 52, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  greeting: { fontSize: T.fontSizeXl, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.5 },
  subGreeting: { fontSize: T.fontSizeSm, color: T.textMuted, marginTop: 2 },

  statsRow: {
    flexDirection: 'row', gap: 1, marginBottom: 1,
    backgroundColor: T.border,
  },
  statBlock: {
    flex: 1, backgroundColor: T.bgCard, alignItems: 'center',
    paddingVertical: 18, paddingHorizontal: 8,
  },
  statBlockAccent: { backgroundColor: T.textPrimary },
  statValue: { fontSize: 28, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.5 },
  statValueAccent: { color: '#fff' },
  statLabel: { fontSize: 10, color: T.textMuted, fontWeight: '600', letterSpacing: 0.5, marginTop: 2 },
  statLabelAccent: { color: 'rgba(255,255,255,0.6)' },

  section: { paddingHorizontal: T.spaceMd, marginTop: T.spaceLg },
  sectionTitle: {
    fontSize: 10, fontWeight: '700', color: T.textMuted,
    letterSpacing: 1.5, marginBottom: 10,
  },

  quickGrid: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  quickBtn: {
    flex: 1, backgroundColor: T.textPrimary, borderRadius: T.radius,
    paddingVertical: 16, alignItems: 'center', gap: 6,
  },
  quickBtnSecondary: {
    backgroundColor: T.bgCard, borderWidth: 1, borderColor: T.border,
  },
  quickLabel: { fontSize: T.fontSizeSm, fontWeight: '700', color: '#fff' },
  quickLabelSecondary: { color: T.textSecondary },

  card: {
    backgroundColor: T.bgCard, borderWidth: 1, borderColor: T.border,
    borderRadius: T.radius, overflow: 'hidden',
  },
  tripRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: T.spaceMd, paddingVertical: 14,
  },
  tripRowBorder: { borderBottomWidth: 1, borderBottomColor: T.border },
  tripLeft: { flex: 1, marginRight: 12 },
  tripPlate: { fontSize: T.fontSizeSm, fontWeight: '700', color: T.textPrimary, letterSpacing: 0.5 },
  tripRoute: { fontSize: 12, color: T.textMuted, marginTop: 2 },
  tripRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tripStatus: { fontSize: 11, color: T.textSecondary, fontWeight: '600' },
});
