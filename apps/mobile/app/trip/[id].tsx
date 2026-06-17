import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../../src/lib/api';
import { useVehicleTracking } from '../../src/lib/useVehicleTracking';
import { Trip, TripStatus } from '../../src/lib/types';

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_LABEL: Record<TripStatus, string> = {
  [TripStatus.ASIGNADO]: 'Asignado',
  [TripStatus.EN_CAMINO_ORIGEN]: 'En camino al origen',
  [TripStatus.EN_CARGA]: 'En carga',
  [TripStatus.EN_TRANSITO]: 'En tránsito',
  [TripStatus.EN_DESCARGA]: 'En descarga',
  [TripStatus.FINALIZADO]: 'Finalizado',
  [TripStatus.CANCELADO]: 'Cancelado',
};

const STATUS_COLOR: Record<TripStatus, { bg: string; text: string }> = {
  [TripStatus.ASIGNADO]: { bg: '#dbeafe', text: '#1e40af' },
  [TripStatus.EN_CAMINO_ORIGEN]: { bg: '#fef9c3', text: '#854d0e' },
  [TripStatus.EN_CARGA]: { bg: '#fef9c3', text: '#854d0e' },
  [TripStatus.EN_TRANSITO]: { bg: '#dcfce7', text: '#166534' },
  [TripStatus.EN_DESCARGA]: { bg: '#fef9c3', text: '#854d0e' },
  [TripStatus.FINALIZADO]: { bg: '#f3f4f6', text: '#6b7280' },
  [TripStatus.CANCELADO]: { bg: '#fee2e2', text: '#991b1b' },
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
  [TripStatus.EN_CAMINO_ORIGEN]: 'Llegar al origen',
  [TripStatus.EN_CARGA]: 'Iniciar tránsito',
  [TripStatus.EN_TRANSITO]: 'Iniciar descarga',
  [TripStatus.EN_DESCARGA]: 'Finalizar viaje',
};

const ACTIVE_STATUSES = new Set<TripStatus>([
  TripStatus.ASIGNADO,
  TripStatus.EN_CAMINO_ORIGEN,
  TripStatus.EN_CARGA,
  TripStatus.EN_TRANSITO,
  TripStatus.EN_DESCARGA,
]);

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TripStatus }) {
  const colors = STATUS_COLOR[status] ?? { bg: '#f3f4f6', text: '#6b7280' };
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>
        {STATUS_LABEL[status] ?? status}
      </Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch trip ──────────────────────────────────────────────────────────────

  const fetchTrip = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get<Trip>(`/trips/${id}`);
      setTrip(res.data);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error al cargar el viaje.');
    }
  }, [id]);

  useEffect(() => {
    fetchTrip().finally(() => setLoading(false));
  }, [fetchTrip]);

  // ── GPS tracking (envía posición mientras el viaje esté activo) ───────────────
  const trackingActive = trip ? ACTIVE_STATUSES.has(trip.status) : false;
  const { isTracking, locationError } = useVehicleTracking(trip?.vehicle?.id, trackingActive);

  // ── Advance status ──────────────────────────────────────────────────────────

  async function handleAdvanceStatus() {
    if (!trip) return;
    const next = NEXT_STATUS[trip.status];
    if (!next) return;

    const label = NEXT_STATUS_LABEL[trip.status] ?? 'Avanzar estado';

    Alert.alert(
      label,
      `¿Confirmás cambiar el estado a "${STATUS_LABEL[next]}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'default',
          onPress: async () => {
            setAdvancing(true);
            try {
              await api.patch(`/trips/${trip.id}/status`, { status: next });
              await fetchTrip();
            } catch (e: any) {
              Alert.alert(
                'Error',
                e?.response?.data?.message ?? 'No se pudo actualizar el estado.',
              );
            } finally {
              setAdvancing(false);
            }
          },
        },
      ],
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  if (error || !trip) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>No se pudo cargar el viaje</Text>
        <Text style={styles.errorSub}>{error ?? 'Viaje no encontrado.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchTrip()}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const nextStatus = NEXT_STATUS[trip.status];
  const canAdvance = !!nextStatus;
  const isFinished =
    trip.status === TripStatus.FINALIZADO ||
    trip.status === TripStatus.CANCELADO;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* GPS tracking indicator */}
      {isTracking && (
        <View style={styles.trackingBanner}>
          <View style={styles.trackingDot} />
          <Text style={styles.trackingText}>Enviando ubicacion</Text>
        </View>
      )}

      {/* Location permission error */}
      {locationError && (
        <View style={styles.locationErrorBanner}>
          <Text style={styles.locationErrorText}>{locationError}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status header */}
        <View style={styles.statusHeader}>
          <StatusBadge status={trip.status} />
          <Text style={styles.tripId}>Viaje #{trip.id.slice(0, 8).toUpperCase()}</Text>
        </View>

        {/* Cargo */}
        {trip.cargo && (
          <SectionCard title="Carga">
            <InfoRow label="Tipo de carga" value={trip.cargo.type} />
            <InfoRow label="Peso" value={`${trip.cargo.weightTons} toneladas`} />
          </SectionCard>
        )}

        {/* Route */}
        {trip.cargo && (
          <SectionCard title="Ruta">
            <View style={styles.routeContainer}>
              <View style={styles.routeItem}>
                <View style={[styles.routeDot, { backgroundColor: '#22c55e' }]} />
                <View style={styles.routeTextWrapper}>
                  <Text style={styles.routeItemLabel}>Origen</Text>
                  <Text style={styles.routeItemValue}>
                    {trip.cargo.originAddress}
                  </Text>
                </View>
              </View>
              <View style={styles.routeConnector} />
              <View style={styles.routeItem}>
                <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
                <View style={styles.routeTextWrapper}>
                  <Text style={styles.routeItemLabel}>Destino</Text>
                  <Text style={styles.routeItemValue}>
                    {trip.cargo.destinationAddress}
                  </Text>
                </View>
              </View>
            </View>
          </SectionCard>
        )}

        {/* Financial */}
        <SectionCard title="Finanzas">
          <InfoRow
            label="Tarifa acordada"
            value={`$${trip.agreedRate.toLocaleString('es-UY')}`}
          />
        </SectionCard>

        {/* Vehicle & driver */}
        {(trip.vehicle || trip.driver) && (
          <SectionCard title="Vehiculo y conductor">
            {trip.vehicle && (
              <InfoRow label="Patente" value={trip.vehicle.plate} />
            )}
            {trip.driver && (
              <InfoRow
                label="Conductor"
                value={`${trip.driver.user.firstName} ${trip.driver.user.lastName}`}
              />
            )}
          </SectionCard>
        )}

        {/* Timestamps */}
        {(trip.startedAt || trip.finishedAt) && (
          <SectionCard title="Tiempos">
            {trip.startedAt && (
              <InfoRow
                label="Inicio"
                value={new Date(trip.startedAt).toLocaleString('es-UY')}
              />
            )}
            {trip.finishedAt && (
              <InfoRow
                label="Finalización"
                value={new Date(trip.finishedAt).toLocaleString('es-UY')}
              />
            )}
          </SectionCard>
        )}

        {/* Advance status button */}
        {canAdvance && !isFinished && (
          <TouchableOpacity
            style={[styles.advanceButton, advancing && styles.advanceButtonDisabled]}
            onPress={handleAdvanceStatus}
            disabled={advancing}
            activeOpacity={0.8}
          >
            {advancing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.advanceButtonText}>
                {NEXT_STATUS_LABEL[trip.status] ?? 'Avanzar estado'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {isFinished && (
          <View style={styles.finishedBanner}>
            <Text style={styles.finishedText}>
              {trip.status === TripStatus.FINALIZADO
                ? 'Este viaje ha finalizado.'
                : 'Este viaje fue cancelado.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },

  // Tracking banner
  trackingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#166534',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  trackingText: {
    color: '#dcfce7',
    fontSize: 13,
    fontWeight: '600',
  },

  // Location error banner
  locationErrorBanner: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  locationErrorText: { color: '#dc2626', fontSize: 13 },

  // Status header
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  tripId: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  badge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { fontSize: 13, fontWeight: '700' },

  // Section card
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },

  // Info row
  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#111827', fontWeight: '500' },

  // Route
  routeContainer: { padding: 16, gap: 0 },
  routeItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  routeDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  routeTextWrapper: { flex: 1 },
  routeItemLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  routeItemValue: { fontSize: 14, color: '#111827', fontWeight: '500' },
  routeConnector: {
    width: 1,
    height: 20,
    backgroundColor: '#d1d5db',
    marginLeft: 5.5,
    marginVertical: 4,
  },

  // Advance button
  advanceButton: {
    backgroundColor: '#1e3a8a',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#1e3a8a',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  advanceButtonDisabled: { opacity: 0.6 },
  advanceButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Finished banner
  finishedBanner: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  finishedText: { color: '#6b7280', fontSize: 15, fontWeight: '500' },

  // Error state
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#1e3a8a',
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
