'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface AccountStatus {
  delinquent: boolean;
  overdueCount: number;
  overdueAmount: number;
  pendingCount: number;
  pendingAmount: number;
  graceDays: number;
}

export function BillingAlertBanner() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const { data } = useQuery<AccountStatus>({
    queryKey: ['billing-account-status'],
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    queryFn: () => api.get('/billing/account-status').then((r) => r.data),
  });

  if (!data) return null;

  // Mora: bloqueo activo
  if (data.delinquent) {
    return (
      <button
        onClick={() => router.push('/facturacion')}
        className="w-full flex items-center gap-3 bg-red-600 text-white px-4 py-3 text-sm text-left hover:bg-red-700 transition-colors"
      >
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <span className="flex-1">
          <strong>Cuenta bloqueada por mora.</strong> Tenés comisiones impagas vencidas por{' '}
          ${Math.round(data.overdueAmount).toLocaleString('es-AR')}. Regularizá el pago para volver a operar.
        </span>
        <span className="underline shrink-0 font-medium">Pagar ahora</span>
      </button>
    );
  }

  // Aviso: hay comisiones pendientes (todavía dentro del plazo de gracia)
  if (data.pendingCount > 0) {
    return (
      <button
        onClick={() => router.push('/facturacion')}
        className="w-full flex items-center gap-3 bg-amber-50 text-amber-800 border-b border-amber-200 px-4 py-2.5 text-sm text-left hover:bg-amber-100 transition-colors"
      >
        <Clock className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          Tenés comisiones pendientes por ${Math.round(data.pendingAmount).toLocaleString('es-AR')}.
          Pagalas antes de los {data.graceDays} días para evitar el bloqueo.
        </span>
        <span className="underline shrink-0 font-medium">Ver</span>
      </button>
    );
  }

  return null;
}
