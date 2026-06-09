import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Trip, TripStatus } from '@/lib/types';

function statusColor(status: TripStatus): string {
  switch (status) {
    case TripStatus.ASIGNADO:
      return '#1e3a8a';
    case TripStatus.EN_CAMINO_ORIGEN:
    case TripStatus.EN_CARGA:
    case TripStatus.EN_TRANSITO:
    case TripStatus.EN_DESCARGA:
      return '#d97706';
    case TripStatus.FINALIZADO:
      return '#16a34a';
    case TripStatus.CANCELADO:
      return '#dc2626';
    default:
      return '#6b7280';
  }
}

function statusLabel(status: TripStatus): string {
  const map: Record<TripStatus, string> = {
    [TripStatus.ASIGNADO]: 'Asignado',
    [TripStatus.EN_CAMINO_ORIGEN]: 'En camino al origen',
    [TripStatus.EN_CARGA]: 'En carga',
    [TripStatus.EN_TRANSITO]: 'En tránsito',
    [TripStatus.EN_DESCARGA]: 'En descarga',
    [TripStatus.FINALIZADO]: 'Finalizado',
    [TripStatus.CANCELADO]: 'Cancelado',
  };
  return map[status] ?? status;
}

function advanceLabel(status: TripStatus): string | null {
  switch (status) {
    case TripStatus.ASIGNADO:
      return 'Salir hacia el origen';
    case TripStatus.EN_CAMINO_ORIGEN:
      return 'Llegué al origen';
    case TripStatus.EN_CARGA:
      return 'Carga completa — salir al destino';
    case TripStatus.EN_TRANSITO:
      return 'Llegué al destino';
    case TripStatus.EN_DESCARGA:
      return 'Finalizar viaje';
    default:
      return null;
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  const {
    data: trip,
    isLoading,
    error,
    refetch,
  } = useQuery<Trip>({
    queryKey: ['trip', id],
    queryFn: async () => {
      const res = await api.get(`/trips/${id}`);
      return res.data?.data ?? res.data;
    },
    enabled: !!id,
  });

  const advanceMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/trips/${id}/advance`);
    },
    onSuccess: () => {
      setAdvanceError(null);
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      refetch();
    },
    onError: (e: any) => {
      const msg =
        e?.response?.data?.message || 'No se pudo avanzar el estado del viaje.';
      setAdvanceError(msg);
    },
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  if (error || !trip) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No se pudo cargar el viaje.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const color = statusColor(trip.status);
  const buttonLabel = advanceLabel(trip.status);
  const isFinalizado = trip.status === TripStatus.FINALIZADO;
  const isCancelado = trip.status === TripStatus.CANCELADO;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estado del viaje</Text>
        <View style={[styles.statusBadgeLarge, { backgroundColor: color + '18', borderColor: color }]}>
          <Text style={[styles.statusBadgeText, { color }]}>{statusLabel(trip.status)}</Text>
        </View>
      </View>

      {/* Cargo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Carga</Text>
        <View style={styles.card}>
          <InfoRow label="Tipo" value={trip.cargo.type} />
          <InfoRow label="Peso" value={`${trip.cargo.weightTons} toneladas`} />
          <InfoRow label="Origen" value={trip.cargo.originAddress} />
          <InfoRow label="Destino" value={trip.cargo.destinationAddress} />
        </View>
      </View>

      {/* Vehicle */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehículo</Text>
        <View style={styles.card}>
          <InfoRow label="Patente" value={trip.vehicle?.plate ?? '—'} />
        </View>
      </View>

      {/* Rate */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tarifa acordada</Text>
        <View style={styles.card}>
          <Text style={styles.rateText}>
            ${Number(trip.agreedRate).toLocaleString('es-UY')}
          </Text>
        </View>
      </View>

      {/* Dates */}
      {(trip.startedAt || trip.finishedAt) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tiempos</Text>
          <View style={styles.card}>
            {trip.startedAt && (
              <InfoRow
                label="Inicio"
                value={new Date(trip.startedAt).toLocaleString('es-UY')}
              />
            )}
            {trip.finishedAt && (
              <InfoRow
                label="Fin"
                value={new Date(trip.finishedAt).toLocaleString('es-UY')}
              />
            )}
          </View>
        </View>
      )}

      {/* Advance error */}
      {advanceError ? (
        <Text style={styles.advanceError}>{advanceError}</Text>
      ) : null}

      {/* Action button */}
      <View style={styles.actionArea}>
        {isFinalizado ? (
          <View style={styles.finalizedBox}>
            <Text style={styles.finalizedText}>Viaje finalizado ✓</Text>
          </View>
        ) : isCancelado ? (
          <View style={[styles.finalizedBox, { backgroundColor: '#fef2f2', borderColor: '#dc2626' }]}>
            <Text style={[styles.finalizedText, { color: '#dc2626' }]}>Viaje cancelado</Text>
          </View>
        ) : buttonLabel ? (
          <TouchableOpacity
            style={[styles.advanceButton, advanceMutation.isPending && styles.advanceButtonDisabled]}
            onPress={() => advanceMutation.mutate()}
            disabled={advanceMutation.isPending}
            activeOpacity={0.8}
          >
            {advanceMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.advanceButtonText}>{buttonLabel}</Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    gap: 12,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    minWidth: 70,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  statusBadgeLarge: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  rateText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e3a8a',
    textAlign: 'center',
    paddingVertical: 4,
  },
  actionArea: {
    marginTop: 8,
  },
  advanceButton: {
    backgroundColor: '#1e3a8a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#1e3a8a',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  advanceButtonDisabled: {
    opacity: 0.6,
  },
  advanceButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  finalizedBox: {
    backgroundColor: '#f0fdf4',
    borderColor: '#16a34a',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  finalizedText: {
    color: '#16a34a',
    fontSize: 16,
    fontWeight: '700',
  },
  advanceError: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 15,
    color: '#dc2626',
  },
  retryButton: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
});
