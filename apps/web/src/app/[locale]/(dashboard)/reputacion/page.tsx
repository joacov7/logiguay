'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, MessageSquare, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { RatingStars } from '@/components/ui/RatingStars';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

const CAT_LABELS: Record<string, string> = {
  puntualidad: 'Puntualidad',
  cuidadoCarga: 'Cuidado de la carga',
  comunicacion: 'Comunicación',
  estadoVehiculo: 'Estado del camión',
  documentacion: 'Documentación',
  puntualidadCarga: 'Puntualidad en carga',
  condicionesLugar: 'Condiciones del lugar',
  pagoTiempo: 'Pago en tiempo',
  tratoPersonal: 'Trato al personal',
};

interface RatingSummary {
  average: number;
  total: number;
  distribution: Record<number, number>;
  categorias: Record<string, number | null>;
  ratings: {
    id: string;
    score: number;
    comment?: string;
    createdAt: string;
    fromUser: { firstName: string; lastName: string; role: string };
  }[];
}

function CategoryBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-40 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${(value / 5) * 100}%`, backgroundColor: '#15A66A' }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-800 w-8 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

export default function ReputacionPage() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  const { data, isLoading } = useQuery<RatingSummary>({
    queryKey: ['ratings-company', companyId],
    enabled: !!companyId,
    queryFn: async () => (await api.get(`/ratings/company/${companyId}`)).data,
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const cats = Object.entries(data?.categorias ?? {})
    .filter(([, v]) => v != null) as [string, number][];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi Reputación</h1>
        <p className="text-sm text-gray-500 mt-1">Cómo te ven los demás usuarios de Logiguay</p>
      </div>

      {!data || data.total === 0 ? (
        <Card>
          <div className="text-center py-16 space-y-3">
            <Star className="h-12 w-12 text-gray-200 mx-auto" />
            <p className="text-gray-500 font-medium">Todavía no tenés calificaciones</p>
            <p className="text-sm text-gray-400">
              Las calificaciones aparecen cuando completás viajes y los otros usuarios te califican.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Hero score */}
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="sm:col-span-1">
              <div className="text-center py-4">
                <p className="text-6xl font-extrabold text-gray-900">{data.average.toFixed(1)}</p>
                <div className="flex justify-center mt-2">
                  <RatingStars score={data.average} size="md" showNumber={false} />
                </div>
                <p className="text-sm text-gray-400 mt-2">{data.total} calificaciones</p>
              </div>

              {/* Distribution bars */}
              <div className="space-y-1.5 mt-4 pt-4 border-t border-gray-50">
                {[5, 4, 3, 2, 1].map((n) => {
                  const count = data.distribution[n] ?? 0;
                  const pct = data.total > 0 ? (count / data.total) * 100 : 0;
                  return (
                    <div key={n} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500 w-2">{n}</span>
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 shrink-0" />
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-yellow-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-gray-400 w-4 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Category breakdown */}
            {cats.length > 0 && (
              <Card className="sm:col-span-2">
                <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-gray-400" /> Por categoría
                </h2>
                <div className="space-y-3">
                  {cats.map(([key, val]) => (
                    <CategoryBar key={key} label={CAT_LABELS[key] ?? key} value={val} />
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Reviews */}
          <Card>
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-400" /> Opiniones recibidas
            </h2>
            <div className="space-y-4">
              {data.ratings.map((r) => (
                <div key={r.id} className="flex gap-4 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-sm font-bold text-gray-500">
                    {r.fromUser.firstName[0]}{r.fromUser.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-semibold text-gray-800">
                        {r.fromUser.firstName} {r.fromUser.lastName}
                      </span>
                      <div className="flex items-center gap-2">
                        <RatingStars score={r.score} size="sm" showNumber={true} />
                        <span className="text-xs text-gray-400">
                          {new Date(r.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    {r.comment && (
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{r.comment}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
