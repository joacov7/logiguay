'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, ShieldAlert, CheckCircle, Truck, Package } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface RateRow {
  plan: 'FREE' | 'PRO' | 'EMPRESA' | 'FLOTA';
  carrierRate: number;
  shipperRate: number;
}

const PLAN_LABEL: Record<string, string> = {
  FREE: 'Free', PRO: 'Pro', EMPRESA: 'Empresa', FLOTA: 'Flota',
};

export default function AdminComisionesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<RateRow[]>([]);
  const [savedPlan, setSavedPlan] = useState<string | null>(null);

  const { data } = useQuery<RateRow[]>({
    queryKey: ['admin-commission-rates'],
    enabled: !!user && user.role === 'ADMIN',
    queryFn: () => api.get('/admin/commission-rates').then((r) => r.data),
  });

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (row: RateRow) =>
      api.patch(`/admin/commission-rates/${row.plan}`, {
        carrierRate: row.carrierRate,
        shipperRate: row.shipperRate,
      }),
    onSuccess: (_res, row) => {
      setSavedPlan(row.plan);
      setTimeout(() => setSavedPlan(null), 2500);
      queryClient.invalidateQueries({ queryKey: ['admin-commission-rates'] });
    },
  });

  if (user && user.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-gray-800">Acceso denegado</h2>
        <p className="text-gray-500">No tenés permisos para acceder a esta sección.</p>
      </div>
    );
  }

  function updateRow(plan: string, field: 'carrierRate' | 'shipperRate', value: number) {
    setRows((prev) => prev.map((r) => (r.plan === plan ? { ...r, [field]: value } : r)));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="h-6 w-6 text-[#15A66A]" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comisiones de plataforma</h1>
          <p className="text-sm text-gray-500">
            Comisión que cobra Logiguay sobre el flete de cada viaje finalizado, según el plan de cada empresa.
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-3">
        <DollarSign className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Cómo funciona</p>
          <p className="text-blue-700 mt-0.5">
            Al finalizar un viaje, se genera una comisión <strong>al transportista</strong> (según su plan)
            y otra <strong>al dador</strong> (según el plan del dador), ambas como deuda pendiente.
            Cuanto mejor el plan, menor la comisión.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {rows.map((row) => {
          const total = (row.carrierRate + row.shipperRate).toFixed(1);
          return (
            <Card key={row.plan}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-800">Plan {PLAN_LABEL[row.plan]}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                  Total {total}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <Truck className="h-4 w-4 text-gray-400" /> Transportista (%)
                  </label>
                  <input
                    type="number" min={0} max={100} step={0.1}
                    value={row.carrierRate}
                    onChange={(e) => updateRow(row.plan, 'carrierRate', parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#15A66A]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <Package className="h-4 w-4 text-gray-400" /> Dador (%)
                  </label>
                  <input
                    type="number" min={0} max={100} step={0.1}
                    value={row.shipperRate}
                    onChange={(e) => updateRow(row.plan, 'shipperRate', parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#15A66A]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-gray-100">
                {savedPlan === row.plan && (
                  <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                    <CheckCircle className="h-4 w-4" /> Guardado
                  </span>
                )}
                <Button
                  variant="primary"
                  loading={mutation.isPending && mutation.variables?.plan === row.plan}
                  onClick={() => mutation.mutate(row)}
                >
                  Guardar
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-gray-400">
        Los cambios aplican a viajes que se finalicen a partir de ahora. Los viajes ya facturados no se modifican.
      </p>
    </div>
  );
}
