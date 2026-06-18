import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, StatusBar, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api, { getApiErrorMessage } from '../../src/lib/api';
import { useVehicleTracking } from '../../src/lib/useVehicleTracking';
import { T } from '../../src/lib/theme';
import { Trip, TripStatus } from '../../src/lib/types';

const STATUS_LABEL: Record<TripStatus, string> = {
  [TripStatus.ASIGNADO]: 'Asignado',
  [TripStatus.EN_CAMINO_ORIGEN]: 'En camino al origen',
  [TripStatus.EN_CARGA]: 'En carga',
  [TripStatus.EN_TRANSITO]: 'En tránsito',
  [TripStatus.EN_DESCARGA]: 'En descarga',
  [TripStatus.FINALIZADO]: 'Finalizado',
  [TripStatus.CANCELADO]: 'Cancelado',
};

const NEXT_STATUS: Partial<Record<TripStatus, TripStatus>> = {
  [TripStatus.ASIGNADO]: TripStatus.EN_CAMINO_ORIGEN,
  [TripStatus.EN_CAMINO_ORIGEN]: TripStatus.EN_CARGA,
  [TripStatus.EN_CARGA]: TripStatus.EN_TRANSITO,
  [TripStatus.EN_TRANSITO]: TripStatus.EN_DESCARGA,
  [TripStatus.EN_DESCARGA]: TripStatus.FINALIZADO,
};

const NEXT_STATUS_LABEL: Partial<Record<TripStatus, string>> = {
  [TripStatus.ASIGNADO]: 'Iniciar viaje al origen',
  [TripStatus.EN_CAMINO_ORIGEN]: 'Llegué al origen',
  [TripStatus.EN_CARGA]: 'Carga completa — salir',
  [TripStatus.EN_TRANSITO]: 'Llegué al destino',
  [TripStatus.EN_DESCARGA]: 'Descarga completa — finalizar',
};

const ACTIVE_STATUSES = new Set<TripStatus>([
  TripStatus.ASIGNADO, TripStatus.EN_CAMINO_ORIGEN,
  TripStatus.EN_CARGA, TripStatus.EN_TRANSITO, TripStatus.EN_DESCARGA,
]);

const STAGES: TripStatus[] = [
  TripStatus.ASIGNADO, TripStatus.EN_CAMINO_ORIGEN, TripStatus.EN_CARGA,
  TripStatus.EN_TRANSITO, TripStatus.EN_DESCARGA, TripStatus.FINALIZADO,
];
const STAGE_SHORT: Record<TripStatus, string> = {
  [TripStatus.ASIGNADO]: 'Asignado',
  [TripStatus.EN_CAMINO_ORIGEN]: 'Al origen',
  [TripStatus.EN_CARGA]: 'Cargando',
  [TripStatus.EN_TRANSITO]: 'En ruta',
  [TripStatus.EN_DESCARGA]: 'Descarga',
  [TripStatus.FINALIZADO]: 'Listo',
  [TripStatus.CANCELADO]: 'Cancelado',
};

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, bold && { fontWeight: '700', color: T.textPrimary }]}>{value}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ['app-settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
    staleTime: 5 * 60_000,
  });
  const navEnabled = settings['feature_navigation_button'] !== 'false';

  const fetchTrip = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get<Trip>(`/trips/${id}`);
      setTrip(res.data);
      setError(null);
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Error al cargar el viaje.'));
    }
  }, [id]);

  useEffect(() => { fetchTrip().finally(() => setLoading(false)); }, [fetchTrip]);

  const trackingActive = trip ? ACTIVE_STATUSES.has(trip.status) : false;
  const { isTracking, locationError } = useVehicleTracking(trip?.vehicle?.id, trackingActive);

  async function handleAdvanceStatus() {
    if (!trip) return;
    const next = NEXT_STATUS[trip.status];
    if (!next) return;
    const label = NEXT_STATUS_LABEL[trip.status] ?? 'Avanzar estado';
    Alert.alert(label, `¿Confirmás el cambio a "${STATUS_LABEL[next]}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          setAdvancing(true);
          try {
            await api.patch(`/trips/${trip.id}/status`, { status: next });
            await fetchTrip();
          } catch (e: any) {
            Alert.alert('Error', getApiErrorMessage(e, 'No se pudo actualizar el estado.'));
          } finally {
            setAdvancing(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={T.accent} />
      </View>
    );
  }

  if (error || !trip) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errTitle}>No se pudo cargar el viaje</Text>
        <Text style={styles.errSub}>{error ?? 'Viaje no encontrado.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchTrip}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stageIndex = STAGES.indexOf(trip.status);
  const canAdvance = !!NEXT_STATUS[trip.status];
  const isFinished = trip.status === TripStatus.FINALIZADO || trip.status === TripStatus.CANCELADO;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bgHeader} />

      {/* Barra de herramientas */}
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={T.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.toolbarTitle}>Viaje #{trip.id.slice(0, 8).toUpperCase()}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* GPS banner */}
      {isTracking && (
        <View style={styles.gpsBanner}>
          <View style={styles.gpsDot} />
          <Text style={styles.gpsText}>GPS activo — enviando ubicación</Text>
        </View>
      )}
      {locationError && (
        <View style={styles.locationErrBanner}>
          <Text style={styles.locationErrText}>{locationError}</Text>
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* Estado actual */}
        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>ESTADO</Text>
          <Text style={styles.statusValue}>{STATUS_LABEL[trip.status]}</Text>
        </View>

        {/* Progreso de etapas */}
        <View style={styles.stagesCard}>
          {STAGES.slice(0, -1).map((stage, i) => {
            const done = stageIndex > i;
            const active = stageIndex === i;
            return (
              <View key={stage} style={styles.stageItem}>
                <View style={[styles.stageDot, done && styles.stageDotDone, active && styles.stageDotActive]} />
                {i < STAGES.length - 2 && (
                  <View style={[styles.stageConnector, done && styles.stageConnectorDone]} />
                )}
                <Text style={[styles.stageText, active && styles.stageTextActive]}>
                  {STAGE_SHORT[stage]}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Carga */}
        {trip.cargo && (
          <Section title="CARGA">
            <Row label="Tipo" value={trip.cargo.type} />
            <Row label="Peso" value={`${trip.cargo.weightTons} toneladas`} />
          </Section>
        )}

        {/* Ruta */}
        {trip.cargo && (
          <Section title="RUTA">
            <View style={styles.routeWrap}>
              <View style={styles.routeItem}>
                <View style={[styles.routeDot, { backgroundColor: T.accent }]} />
                <View>
                  <Text style={styles.routeItemLabel}>ORIGEN</Text>
                  <Text style={styles.routeItemValue}>{trip.cargo.originAddress}</Text>
                </View>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routeItem}>
                <View style={[styles.routeDot, { backgroundColor: T.statusDanger }]} />
                <View>
                  <Text style={styles.routeItemLabel}>DESTINO</Text>
                  <Text style={styles.routeItemValue}>{trip.cargo.destinationAddress}</Text>
                </View>
              </View>
            </View>
          </Section>
        )}

        {/* Finanzas */}
        <Section title="FINANZAS">
          <Row label="Tarifa acordada" value={`$${trip.agreedRate?.toLocaleString('es-AR')}`} bold />
        </Section>

        {/* Vehículo y conductor */}
        {(trip.vehicle || trip.driver) && (
          <Section title="VEHÍCULO Y CONDUCTOR">
            {trip.vehicle && <Row label="Patente" value={trip.vehicle.plate} bold />}
            {trip.driver && (
              <Row label="Conductor" value={`${trip.driver.user.firstName} ${trip.driver.user.lastName}`} />
            )}
          </Section>
        )}

        {/* Tiempos */}
        {(trip.startedAt || trip.finishedAt) && (
          <Section title="TIEMPOS">
            {trip.startedAt && <Row label="Inicio" value={new Date(trip.startedAt).toLocaleString('es-AR')} />}
            {trip.finishedAt && <Row label="Finalización" value={new Date(trip.finishedAt).toLocaleString('es-AR')} />}
          </Section>
        )}

        {/* Abrir ruta en Maps */}
        {navEnabled && trip.cargo && !isFinished && (
          <TouchableOpacity
            style={styles.navBtn}
            activeOpacity={0.8}
            onPress={() => {
              const origin = encodeURIComponent(trip.cargo!.originAddress);
              const dest = encodeURIComponent(trip.cargo!.destinationAddress);
              const url = `https://maps.google.com/?saddr=${origin}&daddr=${dest}&dirflg=d`;
              Linking.openURL(url).catch(() =>
                Alert.alert('Error', 'No se pudo abrir el mapa.')
              );
            }}
          >
            <Ionicons name="navigate-outline" size={18} color={T.accent} />
            <Text style={styles.navBtnText}>Abrir ruta en Maps</Text>
          </TouchableOpacity>
        )}

        {/* Acción */}
        {canAdvance && !isFinished && (
          <TouchableOpacity
            style={[styles.advanceBtn, advancing && styles.advanceBtnDisabled]}
            onPress={handleAdvanceStatus}
            disabled={advancing}
            activeOpacity={0.8}
          >
            {advancing
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.advanceBtnText}>{NEXT_STATUS_LABEL[trip.status] ?? 'Avanzar estado'}</Text>
            }
          </TouchableOpacity>
        )}

        {isFinished && (
          <View style={styles.finishedNote}>
            <Text style={styles.finishedNoteText}>
              {trip.status === TripStatus.FINALIZADO ? 'Este viaje ha finalizado.' : 'Este viaje fue cancelado.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bgApp },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { flex: 1 },
  scrollContent: { padding: T.spaceMd, paddingBottom: 40, gap: 10 },

  toolbar: {
    backgroundColor: T.bgHeader, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: T.spaceMd, paddingTop: 52, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: T.radiusSm,
    borderWidth: 1, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
  },
  toolbarTitle: { fontSize: T.fontSizeMd, fontWeight: '700', color: T.textPrimary },

  gpsBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.accentLight, paddingHorizontal: T.spaceMd, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  gpsDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.accent },
  gpsText: { fontSize: 12, fontWeight: '600', color: T.accent },
  locationErrBanner: {
    backgroundColor: '#FEF2F2', paddingHorizontal: T.spaceMd, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#FECACA',
  },
  locationErrText: { fontSize: 12, color: T.statusDanger },

  statusBlock: {
    backgroundColor: T.bgCard, borderWidth: 1, borderColor: T.border,
    borderRadius: T.radius, padding: T.spaceMd,
    borderLeftWidth: 3, borderLeftColor: T.textPrimary,
  },
  statusLabel: { fontSize: 10, fontWeight: '700', color: T.textMuted, letterSpacing: 1, marginBottom: 4 },
  statusValue: { fontSize: T.fontSizeLg, fontWeight: '800', color: T.textPrimary },

  stagesCard: {
    backgroundColor: T.bgCard, borderWidth: 1, borderColor: T.border,
    borderRadius: T.radius, padding: T.spaceMd,
    flexDirection: 'row', alignItems: 'flex-start',
  },
  stageItem: { flex: 1, alignItems: 'center' },
  stageDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.border, marginBottom: 4 },
  stageDotDone: { backgroundColor: T.accent },
  stageDotActive: { backgroundColor: T.textPrimary, width: 10, height: 10, borderRadius: 5 },
  stageConnector: {
    position: 'absolute', top: 3.5, left: '55%',
    width: '90%', height: 1, backgroundColor: T.border,
  },
  stageConnectorDone: { backgroundColor: T.accent },
  stageText: { fontSize: 9, color: T.textMuted, textAlign: 'center' },
  stageTextActive: { color: T.textPrimary, fontWeight: '700' },

  section: {
    backgroundColor: T.bgCard, borderWidth: 1, borderColor: T.border,
    borderRadius: T.radius, overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 10, fontWeight: '700', color: T.textMuted, letterSpacing: 1.2,
    paddingHorizontal: T.spaceMd, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.bgMuted,
  },

  row: {
    paddingHorizontal: T.spaceMd, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  rowLabel: { fontSize: 11, color: T.textMuted, marginBottom: 2 },
  rowValue: { fontSize: T.fontSizeMd, color: T.textSecondary, fontWeight: '500' },

  routeWrap: { padding: T.spaceMd, gap: 0 },
  routeItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  routeDot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  routeItemLabel: { fontSize: 9, fontWeight: '700', color: T.textMuted, letterSpacing: 0.8, marginBottom: 2 },
  routeItemValue: { fontSize: T.fontSizeSm, color: T.textPrimary, fontWeight: '500', flex: 1 },
  routeLine: { width: 1, height: 14, backgroundColor: T.border, marginLeft: 5, marginVertical: 3 },

  navBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: T.accent, borderRadius: T.radius,
    paddingVertical: 13, marginTop: 4, backgroundColor: T.accentLight,
  },
  navBtnText: { color: T.accent, fontSize: T.fontSizeMd, fontWeight: '700' },

  advanceBtn: {
    backgroundColor: T.textPrimary, borderRadius: T.radius,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  advanceBtnDisabled: { opacity: 0.5 },
  advanceBtnText: { color: '#fff', fontSize: T.fontSizeMd, fontWeight: '700' },

  finishedNote: {
    borderWidth: 1, borderColor: T.border, borderRadius: T.radius,
    padding: T.spaceMd, alignItems: 'center', marginTop: 4,
  },
  finishedNoteText: { color: T.textMuted, fontSize: T.fontSizeSm, fontWeight: '500' },

  errTitle: { fontSize: T.fontSizeLg, fontWeight: '700', color: T.textPrimary, marginBottom: 8 },
  errSub: { fontSize: T.fontSizeSm, color: T.textMuted, marginBottom: 24, textAlign: 'center' },
  retryBtn: {
    backgroundColor: T.textPrimary, borderRadius: T.radius,
    paddingHorizontal: 32, paddingVertical: 12,
  },
  retryText: { color: '#fff', fontSize: T.fontSizeSm, fontWeight: '700' },
});
