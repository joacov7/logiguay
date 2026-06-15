import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Status =
  | 'ASIGNADO'
  | 'EN_CAMINO_ORIGEN'
  | 'EN_CARGA'
  | 'EN_TRANSITO'
  | 'EN_DESCARGA'
  | 'FINALIZADO'
  | 'CANCELADO'
  | 'PUBLICADA'
  | 'COTIZANDO'
  | 'ASIGNADA'
  | 'COMPLETADA'
  | 'DRAFT';

interface StatusConfig {
  label: string;
  bg: string;
  text: string;
}

const STATUS_MAP: Record<Status, StatusConfig> = {
  ASIGNADO:        { label: 'Asignado',    bg: '#DBEAFE', text: '#1D4ED8' },
  EN_CAMINO_ORIGEN:{ label: 'En camino',   bg: '#FEF9C3', text: '#854D0E' },
  EN_CARGA:        { label: 'Cargando',    bg: '#FFEDD5', text: '#C2410C' },
  EN_TRANSITO:     { label: 'En tránsito', bg: '#DCFCE7', text: '#15803D' },
  EN_DESCARGA:     { label: 'Descargando', bg: '#FFEDD5', text: '#C2410C' },
  FINALIZADO:      { label: 'Finalizado',  bg: '#F3F4F6', text: '#6B7280' },
  CANCELADO:       { label: 'Cancelado',   bg: '#FEE2E2', text: '#DC2626' },
  PUBLICADA:       { label: 'Publicada',   bg: '#DCFCE7', text: '#15803D' },
  COTIZANDO:       { label: 'Cotizando',   bg: '#DBEAFE', text: '#1D4ED8' },
  ASIGNADA:        { label: 'Asignada',    bg: '#F3E8FF', text: '#7E22CE' },
  COMPLETADA:      { label: 'Completada',  bg: '#F3F4F6', text: '#6B7280' },
  DRAFT:           { label: 'Borrador',    bg: '#F3F4F6', text: '#6B7280' },
};

interface Props {
  status: string;
}

export function StatusBadge({ status }: Props) {
  const config = STATUS_MAP[status as Status] ?? {
    label: status,
    bg: '#F3F4F6',
    text: '#6B7280',
  };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
