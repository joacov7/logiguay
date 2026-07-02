'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import Link from 'next/link';

export function DocumentAlertBanner() {
  const { user } = useAuth();
  const companyId = (user as any)?.companyId;
  const [dismissed, setDismissed] = React.useState(false);

  const { data } = useQuery({
    queryKey: ['expiring-docs', companyId],
    enabled: !!companyId && !dismissed,
    staleTime: 60 * 60 * 1000, // 1 hour
    queryFn: async () => {
      const res = await api.get(`/documents?companyId=${companyId}&status=POR_VENCER&limit=100`);
      const vencidos = await api.get(`/documents?companyId=${companyId}&status=VENCIDO&limit=100`);
      return {
        porVencer: res.data?.total ?? (Array.isArray(res.data) ? res.data.length : 0),
        vencidos: vencidos.data?.total ?? (Array.isArray(vencidos.data) ? vencidos.data.length : 0),
      };
    },
  });

  if (dismissed || (!data?.porVencer && !data?.vencidos)) return null;

  const hasExpired = (data?.vencidos ?? 0) > 0;
  const hasExpiring = (data?.porVencer ?? 0) > 0;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium mb-4 ${
      hasExpired ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-amber-50 border border-amber-200 text-amber-800'
    }`}>
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        {hasExpired && `${data!.vencidos} documento${data!.vencidos > 1 ? 's' : ''} vencido${data!.vencidos > 1 ? 's' : ''}. `}
        {hasExpiring && `${data!.porVencer} documento${data!.porVencer > 1 ? 's' : ''} por vencer en los próximos 30 días. `}
        <Link href="/documentos" className="underline font-semibold">Revisá tu documentación →</Link>
      </span>
      <button onClick={() => setDismissed(true)} className="shrink-0 opacity-60 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
