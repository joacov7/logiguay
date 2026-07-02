import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  secondary: 'bg-purple-100 text-purple-800',
};

export function Badge({ children, variant = 'default', size = 'md', className = '' }: BadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs';
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
    ACTIVO: { label: 'Activo', variant: 'success' },
    INACTIVO: { label: 'Inactivo', variant: 'secondary' },
    MANTENIMIENTO: { label: 'Mantenimiento', variant: 'warning' },
    PENDIENTE: { label: 'Pendiente', variant: 'warning' },
    PUBLICADO: { label: 'Publicado', variant: 'info' },
    COTIZANDO: { label: 'Cotizando', variant: 'info' },
    ASIGNADO: { label: 'Asignado', variant: 'success' },
    EN_CAMINO_ORIGEN: { label: 'En camino', variant: 'info' },
    EN_CARGA: { label: 'Cargando', variant: 'info' },
    EN_TRANSITO: { label: 'En tránsito', variant: 'info' },
    EN_DESCARGA: { label: 'Descargando', variant: 'info' },
    FINALIZADO: { label: 'Finalizado', variant: 'success' },
    CANCELADO: { label: 'Cancelado', variant: 'danger' },
    VIGENTE: { label: 'Vigente', variant: 'success' },
    VENCIDO: { label: 'Vencido', variant: 'danger' },
    POR_VENCER: { label: 'Por vencer', variant: 'warning' },
    ACEPTADA: { label: 'Aceptada', variant: 'success' },
    RECHAZADA: { label: 'Rechazada', variant: 'danger' },
    PAGADA: { label: 'Pagada', variant: 'success' },
  };

  const config = statusConfig[status] || { label: status, variant: 'default' as BadgeVariant };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
