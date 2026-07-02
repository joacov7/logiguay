import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { getUser } from '../../src/lib/auth';
import api, { getApiErrorMessage } from '../../src/lib/api';
import { useVehicleTracking } from '../../src/lib/useVehicleTracking';
import { T } from '../../src/lib/theme';
import { User, Trip } from '../../src/lib/types';

const ACTIVE_STATUSES = new Set([
  'ASIGNADO', 'EN_CAMINO_ORIGEN', 'EN_CARGA', 'EN_TRANSITO', 'EN_DESCARGA',
]);

const STATUS_LABEL: Record<string, string> = {
  ASIGNADO: 'Asignado',
  EN_CAMINO_ORIGEN: 'En camino al origen',
  EN_CARGA: 'En carga',
  EN_TRANSITO: 'En tránsito',
  EN_DESCARGA: 'En descarga',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

const NEXT_STATUS: Record<string, { status: string; label: string } | null> = {
  ASIGNADO: { status: 'EN_CAMINO_ORIGEN', label: 'Salir hacia el origen' },
  EN_CAMINO_ORIGEN: { status: 'EN_CARGA', label: 'Llegué al origen' },
  EN_CARGA: { status: 'EN_TRANSITO', label: 'Carga completa — Salir' },
  EN_TRANSITO: { status: 'EN_DESCARGA', label: 'Llegué al destino' },
  EN_DESCARGA: { status: 'FINALIZADO', label: 'Descarga completa — Finalizar' },
  FINALIZADO: null,
  CANCELADO: null,
};

// Barra de progreso de etapas
const STAGES = ['ASIGNADO', 'EN_CAMINO_ORIGEN', 'EN_CARGA', 'EN_TRANSITO', 'EN_DESCARGA', 'FINALIZADO'];
const STAGE_SHORT: Record<string, string> = {
  ASIGNADO: 'Asignado',
  EN_CAMINO_ORIGEN: 'Al origen',
  EN_CARGA: 'Cargando',
  EN_TRANSITO: 'En ruta',
  EN_DESCARGA: 'Descarga',
  FINALIZADO: 'Listo',
};

export default function ChoferTripScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const trackingActive = trip ? ACTIVE_STATUSES.has(trip.status) : false;
  const { isTracking } = useVehicleTracking(trip?.vehicle?.id, trackingActive);

  async function fetchTrip(u?: User | null) {
    const currentUser = u ?? user;
    if (!currentUser) return;
    try {
      const res = await api.get('/trips', {
        params: { status: 'ASIGNADO,EN_CAMINO_ORIGEN,EN_CARGA,EN_TRANSITO,EN_DESCARGA' },
      });
      const trips = res.data?.data ?? res.data ?? [];
      setTrip(trips[0] ?? null);
      setLoadError(null);
    } catch (e: unknown) {
      // No pisamos el viaje ya cargado: si fue un fallo de red puntual durante
      // un refresh, el chofer conserva la info que ya tenía en pantalla.
      setLoadError(getApiErrorMessage(e, 'No se pudo cargar tu viaje.'));
    }
  }

  useEffect(() => {
    let mounted = true;
    getUser().then(async (u) => {
      if (!mounted) return;
      setUser(u);
      await fetchTrip(u);
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrip();
    setRefreshing(false);
  }, [user]);

  async function advanceStatus() {
    if (!trip) return;
    const next = NEXT_STATUS[trip.status];
    if (!next) return;
    Alert.alert('Confirmar acción', `¿${next.label}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          setUpdating(true);
          try {
            await api.patch(`/trips/${trip.id}/status`, { status: next.status });
            await fetchTrip(user);
          } catch (e: any) {
            Alert.alert('Error', getApiErrorMessage(e, 'No se pudo actualizar el estado.'));
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={T.accent} />
      </View>
    );
  }

  const stageIndex = trip ? STAGES.indexOf(trip.status) : -1;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bgHeader} />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Mi Viaje</Text>
          {user && <Text style={s.headerSub}>{user.firstName} {user.lastName}</Text>}
        </View>
        {isTracking && (
          <View style={s.gpsPill}>
            <View style={s.gpsDot} />
            <Text style={s.gpsText}>GPS activo</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />}
      >
        {!trip && loadError ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📡</Text>
            <Text style={s.emptyTitle}>No pudimos cargar tu viaje</Text>
            <Text style={s.emptySub}>{loadError}</Text>
            <TouchableOpacity
              style={s.retryBtn}
              onPress={() => fetchTrip()}
              activeOpacity={0.85}
            >
              <Text style={s.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : !trip ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📦</Text>
            <Text style={s.emptyTitle}>Sin viaje activo</Text>
            <Text style={s.emptySub}>Tu transportista te asignará un viaje.</Text>
          </View>
        ) : (
          <View style={s.content}>

            {/* Stage progress */}
            <View style={s.stageRow}>
              {STAGES.slice(0, -1).map((stage, i) => {
                const done = stageIndex > i;
                const active = stageIndex === i;
                return (
                  <View key={stage} style={s.stageItem}>
                    <View style={[
                      s.stageDot,
                      done && s.stageDotDone,
                      active && s.stageDotActive,
                    ]} />
                    <Text style={[s.stageLabel, active && s.stageLabelActive]}>
                      {STAGE_SHORT[stage]}
                    </Text>
                    {i < STAGES.length - 2 && (
                      <View style={[s.stageLine, done && s.stageLineDone]} />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Status banner */}
            <View style={s.statusBanner}>
              <Text style={s.statusBannerLabel}>ESTADO ACTUAL</Text>
              <Text style={s.statusBannerValue}>{STATUS_LABEL[trip.status] ?? trip.status}</Text>
            </View>

            {/* Route */}
            {trip.cargo && (
              <View style={s.card}>
                <Text style={s.cardHeader}>RUTA</Text>
                <View style={s.routeRow}>
                  <View style={[s.routeDot, { backgroundColor: T.accent }]} />
                  <View style={s.routeInfo}>
                    <Text style={s.routeLabel}>ORIGEN</Text>
                    <Text style={s.routeText}>{trip.cargo.originAddress}</Text>
                  </View>
                </View>
                <View style={s.routeLine} />
                <View style={s.routeRow}>
                  <View style={[s.routeDot, { backgroundColor: T.statusDanger }]} />
                  <View style={s.routeInfo}>
                    <Text style={s.routeLabel}>DESTINO</Text>
                    <Text style={s.routeText}>{trip.cargo.destinationAddress}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Cargo details */}
            <View style={s.card}>
              <Text style={s.cardHeader}>CARGA</Text>
              {trip.cargo && (
                <>
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Tipo</Text>
                    <Text style={s.infoValue}>{trip.cargo.type}</Text>
                  </View>
                  {trip.cargo.weightTons != null && (
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>Peso</Text>
                      <Text style={s.infoValue}>{trip.cargo.weightTons} t</Text>
                    </View>
                  )}
                </>
              )}
              <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={s.infoLabel}>Tarifa acordada</Text>
                <Text style={[s.infoValue, { color: T.accent, fontWeight: '700' }]}>
                  {trip.agreedRate != null ? `$${trip.agreedRate.toLocaleString('es-AR')}` : '—'}
                </Text>
              </View>
            </View>

            {/* Vehículo */}
            {trip.vehicle && (
              <View style={s.card}>
                <Text style={s.cardHeader}>VEHÍCULO</Text>
                <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
                  <Text style={s.infoLabel}>Patente</Text>
                  <Text style={[s.infoValue, { fontWeight: '700', letterSpacing: 1 }]}>
                    {trip.vehicle.plate}
                  </Text>
                </View>
              </View>
            )}

            {/* Action */}
            {NEXT_STATUS[trip.status] && (
              <TouchableOpacity
                style={[s.actionBtn, updating && s.actionBtnDisabled]}
                onPress={advanceStatus}
                disabled={updating}
                activeOpacity={0.8}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={s.actionText}>{NEXT_STATUS[trip.status]!.label}</Text>
                    <ChevronRight color="#fff" size={18} />
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bgApp },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },

  header: {
    backgroundColor: T.bgHeader, paddingHorizontal: T.spaceMd,
    paddingTop: 52, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: T.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  headerTitle: { fontSize: T.fontSizeXl, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.5 },
  headerSub: { fontSize: T.fontSizeSm, color: T.textMuted, marginTop: 2 },
  gpsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: T.accentLight, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: T.radiusSm,
  },
  gpsDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.accent },
  gpsText: { fontSize: 11, fontWeight: '700', color: T.accent, letterSpacing: 0.5 },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: T.fontSizeLg, fontWeight: '700', color: T.textPrimary, marginBottom: 8 },
  emptySub: { fontSize: T.fontSizeSm, color: T.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: {
    marginTop: 20, backgroundColor: T.textPrimary, borderRadius: T.radius,
    paddingHorizontal: 32, paddingVertical: 12,
  },
  retryText: { color: '#fff', fontSize: T.fontSizeSm, fontWeight: '700' },

  content: { padding: T.spaceMd, gap: 10, paddingBottom: 40 },

  // Stage progress
  stageRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: T.bgCard, borderWidth: 1, borderColor: T.border,
    borderRadius: T.radius, padding: 14, paddingBottom: 10, gap: 0,
  },
  stageItem: { flex: 1, alignItems: 'center', position: 'relative' },
  stageDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: T.border, marginBottom: 5,
  },
  stageDotDone: { backgroundColor: T.accent },
  stageDotActive: { backgroundColor: T.textPrimary, width: 10, height: 10, borderRadius: 5 },
  stageLine: {
    position: 'absolute', top: 4, left: '60%',
    width: '80%', height: 1, backgroundColor: T.border,
  },
  stageLineDone: { backgroundColor: T.accent },
  stageLabel: { fontSize: 9, color: T.textMuted, textAlign: 'center', letterSpacing: 0.3 },
  stageLabelActive: { color: T.textPrimary, fontWeight: '700' },

  // Status
  statusBanner: {
    backgroundColor: T.bgCard, borderWidth: 1, borderColor: T.border,
    borderRadius: T.radius, padding: T.spaceMd,
    borderLeftWidth: 3, borderLeftColor: T.textPrimary,
  },
  statusBannerLabel: { fontSize: 10, fontWeight: '700', color: T.textMuted, letterSpacing: 1, marginBottom: 4 },
  statusBannerValue: { fontSize: T.fontSizeLg, fontWeight: '800', color: T.textPrimary },

  // Card
  card: {
    backgroundColor: T.bgCard, borderWidth: 1, borderColor: T.border,
    borderRadius: T.radius, overflow: 'hidden',
  },
  cardHeader: {
    fontSize: 10, fontWeight: '700', color: T.textMuted, letterSpacing: 1.2,
    paddingHorizontal: T.spaceMd, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.bgMuted,
  },

  // Route
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: T.spaceMd, paddingVertical: 12 },
  routeDot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  routeInfo: { flex: 1 },
  routeLabel: { fontSize: 9, fontWeight: '700', color: T.textMuted, letterSpacing: 0.8, marginBottom: 2 },
  routeText: { fontSize: T.fontSizeSm, color: T.textPrimary, fontWeight: '500' },
  routeLine: { width: 1, height: 14, backgroundColor: T.border, marginLeft: 20, marginVertical: 2 },

  // Info rows
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: T.spaceMd, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  infoLabel: { fontSize: T.fontSizeSm, color: T.textSecondary },
  infoValue: { fontSize: T.fontSizeSm, color: T.textPrimary, fontWeight: '500' },

  // Action button
  actionBtn: {
    backgroundColor: T.textPrimary, borderRadius: T.radius,
    paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionText: { color: '#fff', fontSize: T.fontSizeMd, fontWeight: '700' },
});
