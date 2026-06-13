'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Crown, Check, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

type PlanType = 'FREE' | 'PRO' | 'EMPRESA' | 'FLOTA';

interface Subscription {
  id: string;
  plan: PlanType;
  status: string;
  startDate: string;
  endDate: string;
  amount: number;
}

interface PlanLimits {
  maxVehicles: number;
  maxDrivers: number;
  maxActiveTrips: number;
  maxMonthlyPublications: number;
  canAccessMarketplace: boolean;
  canUsePremiumListings: boolean;
  canExportReports: boolean;
  commissionRate: number;
}

interface PlanDefinition {
  name: PlanType;
  label: string;
  price: number;
  priceLabel: string;
  recommended?: boolean;
  features: { label: string; included: boolean }[];
}

const PLANS: PlanDefinition[] = [
  {
    name: 'FREE',
    label: 'Free',
    price: 0,
    priceLabel: 'Gratis',
    features: [
      { label: '3 vehículos', included: true },
      { label: '3 choferes', included: true },
      { label: '5 viajes activos', included: true },
      { label: '10 publicaciones/mes', included: true },
      { label: 'Acceso al marketplace', included: true },
      { label: 'Publicaciones destacadas', included: false },
      { label: 'Exportar reportes', included: false },
      { label: 'Comisión 3.5%', included: true },
    ],
  },
  {
    name: 'PRO',
    label: 'Pro',
    price: 29900,
    priceLabel: '$29.900 ARS/mes',
    recommended: true,
    features: [
      { label: '15 vehículos', included: true },
      { label: '15 choferes', included: true },
      { label: '30 viajes activos', included: true },
      { label: '100 publicaciones/mes', included: true },
      { label: 'Acceso al marketplace', included: true },
      { label: 'Publicaciones destacadas', included: true },
      { label: 'Exportar reportes', included: true },
      { label: 'Comisión 2.5%', included: true },
    ],
  },
  {
    name: 'EMPRESA',
    label: 'Empresa',
    price: 89900,
    priceLabel: '$89.900 ARS/mes',
    features: [
      { label: '50 vehículos', included: true },
      { label: '50 choferes', included: true },
      { label: '200 viajes activos', included: true },
      { label: '500 publicaciones/mes', included: true },
      { label: 'Acceso al marketplace', included: true },
      { label: 'Publicaciones destacadas', included: true },
      { label: 'Exportar reportes', included: true },
      { label: 'Comisión 1.5%', included: true },
    ],
  },
  {
    name: 'FLOTA',
    label: 'Flota',
    price: 199900,
    priceLabel: '$199.900 ARS/mes',
    features: [
      { label: 'Vehículos ilimitados', included: true },
      { label: 'Choferes ilimitados', included: true },
      { label: 'Viajes activos ilimitados', included: true },
      { label: 'Publicaciones ilimitadas', included: true },
      { label: 'Acceso al marketplace', included: true },
      { label: 'Publicaciones destacadas', included: true },
      { label: 'Exportar reportes', included: true },
      { label: 'Comisión 1.0%', included: true },
    ],
  },
];

const MONTH_OPTIONS = [
  { value: 1, label: '1 mes' },
  { value: 3, label: '3 meses (-8%)' },
  { value: 6, label: '6 meses (-15%)' },
  { value: 12, label: '12 meses (-20%)' },
];

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  ACTIVA: 'success',
  TRIAL: 'info',
  CANCELADA: 'danger',
  VENCIDA: 'danger',
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

export default function SuscripcionPage() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [months, setMonths] = useState(1);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get('status');

  useEffect(() => {
    if (paymentStatus === 'success') {
      queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-limits'] });
    }
  }, [paymentStatus, queryClient]);

  const currentQuery = useQuery<Subscription | null>({
    queryKey: ['subscription-current', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const res = await api.get(`/subscriptions/current/${companyId}`);
      return res.data;
    },
  });

  const limitsQuery = useQuery<PlanLimits>({
    queryKey: ['subscription-limits', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const res = await api.get(`/subscriptions/limits/${companyId}`);
      return res.data;
    },
  });

  const activateMutation = useMutation({
    mutationFn: async ({ plan, months: m }: { plan: PlanType; months: number }) => {
      const res = await api.post('/subscriptions/create-preference', { plan, months: m });
      return res.data as { init_point?: string; sandbox_init_point?: string; free?: boolean; subscription?: any };
    },
    onSuccess: (data) => {
      if (data.free) {
        // Plan FREE activado directamente
        queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
        queryClient.invalidateQueries({ queryKey: ['subscription-limits'] });
        setSelectedPlan(null);
      } else if (data.init_point) {
        // Redirigir a MercadoPago
        window.location.href = data.init_point;
      }
    },
  });

  const current = currentQuery.data;
  const limits = limitsQuery.data;

  const limitItems = limits
    ? [
        { label: 'Vehículos', value: limits.maxVehicles >= 999999 ? 'Ilimitados' : limits.maxVehicles },
        { label: 'Choferes', value: limits.maxDrivers >= 999999 ? 'Ilimitados' : limits.maxDrivers },
        { label: 'Viajes activos', value: limits.maxActiveTrips >= 999999 ? 'Ilimitados' : limits.maxActiveTrips },
        { label: 'Publicaciones/mes', value: limits.maxMonthlyPublications >= 999999 ? 'Ilimitadas' : limits.maxMonthlyPublications },
        { label: 'Comisión plataforma', value: `${limits.commissionRate}%` },
      ]
    : [];

  const selectedPlanDef = PLANS.find((p) => p.name === selectedPlan);
  const totalAmount = selectedPlanDef ? selectedPlanDef.price * months : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Suscripción</h1>
        <p className="text-sm text-gray-500 mt-1">Gestiona tu plan y límites de uso</p>
      </div>

      {paymentStatus === 'success' && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-800">
          <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <span className="text-sm font-medium">¡Pago aprobado! Tu plan fue activado correctamente.</span>
        </div>
      )}
      {paymentStatus === 'failure' && (
        <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-800">
          <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
          <span className="text-sm font-medium">El pago no pudo procesarse. Podés intentarlo nuevamente.</span>
        </div>
      )}

      {/* Current plan card */}
      {current && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Crown className="h-6 w-6 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-500">Plan actual</p>
                  <p className="text-xl font-bold text-gray-900">{current.plan}</p>
                </div>
                <Badge variant={STATUS_VARIANT[current.status] ?? 'default'}>
                  {current.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-500">
                Vence el{' '}
                <span className="font-medium text-gray-700">
                  {new Date(current.endDate).toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </p>
            </div>

            {limits && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                {limitItems.map(({ label, value }) => (
                  <div key={label} className="text-sm">
                    <span className="text-gray-500">{label}: </span>
                    <span className="font-semibold text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const isCurrentPlan = current?.plan === plan.name;
          return (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border-2 p-6 transition-shadow ${
                plan.recommended
                  ? 'border-blue-500 shadow-lg shadow-blue-100'
                  : 'border-gray-200'
              }`}
            >
              {plan.recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                  Recomendado
                </span>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">{plan.label}</h3>
                <p className="text-sm font-semibold text-blue-600 mt-1">{plan.priceLabel}</p>
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map(({ label, included }) => (
                  <li key={label} className="flex items-center gap-2 text-sm">
                    {included ? (
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-gray-300 shrink-0" />
                    )}
                    <span className={included ? 'text-gray-700' : 'text-gray-400'}>
                      {label}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                variant={isCurrentPlan ? 'secondary' : plan.recommended ? 'primary' : 'outline'}
                disabled={isCurrentPlan}
                onClick={() => {
                  setSelectedPlan(plan.name);
                  setMonths(1);
                }}
                className="w-full"
              >
                {isCurrentPlan ? 'Plan actual' : 'Activar'}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Activation modal */}
      {selectedPlan && selectedPlanDef && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Activar plan {selectedPlanDef.label}</h2>
              <p className="text-sm text-gray-500 mt-1">Selecciona la duración de tu suscripción</p>
            </div>

            <div className="space-y-2">
              {MONTH_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setMonths(value)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm transition-colors ${
                    months === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{label}</span>
                  <span className="font-semibold">
                    {selectedPlanDef.price === 0 ? 'Gratis' : formatCurrency(selectedPlanDef.price * value)}
                  </span>
                </button>
              ))}
            </div>

            {selectedPlanDef.price > 0 && (
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <span className="text-gray-600 font-medium">Total a pagar</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(totalAmount)}</span>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setSelectedPlan(null)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={() => activateMutation.mutate({ plan: selectedPlan, months })}
                disabled={activateMutation.isPending}
                className="flex-1"
              >
                {activateMutation.isPending
                  ? 'Procesando...'
                  : selectedPlanDef?.price === 0 ? 'Activar gratis' : 'Ir a pagar con MercadoPago'
                }
              </Button>
            </div>

            {activateMutation.isError && (
              <p className="text-sm text-red-600 text-center">
                Error al activar el plan. Intentá nuevamente.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
