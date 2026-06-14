'use client';

import React, { useState } from 'react';
import { X, Star, CheckCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// Categories shown when a DADOR rates a TRANSPORTISTA
const CATS_TRANSPORTISTA = [
  { key: 'puntualidad',    label: 'Puntualidad',          desc: '¿Llegó a tiempo?' },
  { key: 'cuidadoCarga',   label: 'Cuidado de la carga',  desc: '¿Trató bien la mercadería?' },
  { key: 'comunicacion',   label: 'Comunicación',          desc: '¿Avisó novedades? ¿Respondió?' },
  { key: 'estadoVehiculo', label: 'Estado del camión',     desc: '¿El vehículo estaba en buenas condiciones?' },
  { key: 'documentacion',  label: 'Documentación',         desc: '¿Tenía todos los papeles en regla?' },
] as const;

// Categories shown when a TRANSPORTISTA rates a DADOR
const CATS_DADOR = [
  { key: 'puntualidadCarga',  label: 'Puntualidad en carga',  desc: '¿El lugar estaba listo a tiempo?' },
  { key: 'condicionesLugar',  label: 'Condiciones del lugar',  desc: '¿Buen acceso, playa, comodidades?' },
  { key: 'pagoTiempo',        label: 'Pago en tiempo',         desc: '¿Pagó según lo acordado?' },
  { key: 'tratoPersonal',     label: 'Trato al personal',      desc: '¿El chofer fue bien recibido?' },
] as const;

type CatKey =
  | 'puntualidad' | 'cuidadoCarga' | 'comunicacion' | 'estadoVehiculo' | 'documentacion'
  | 'puntualidadCarga' | 'condicionesLugar' | 'pagoTiempo' | 'tratoPersonal';

interface Props {
  tripId: string;
  toUserId: string;
  toCompanyId?: string;
  toName: string;
  raterRole: 'DADOR' | 'TRANSPORTISTA';
  onClose: () => void;
}

function StarRow({
  label, desc, value, onChange,
}: { label: string; desc: string; value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="focus:outline-none"
          >
            <Star
              className="h-6 w-6 transition-colors"
              fill={n <= (hover || value) ? '#FBBF24' : 'none'}
              stroke={n <= (hover || value) ? '#FBBF24' : '#d1d5db'}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

const SCORE_LABELS = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];

export function RatingModal({ tripId, toUserId, toCompanyId, toName, raterRole, onClose }: Props) {
  const queryClient = useQueryClient();
  const cats = raterRole === 'DADOR' ? CATS_TRANSPORTISTA : CATS_DADOR;

  const [scores, setScores] = useState<Partial<Record<CatKey, number>>>({});
  const [comment, setComment] = useState('');
  const [success, setSuccess] = useState(false);

  const filledCount = Object.values(scores).filter((v) => v && v > 0).length;
  const avgScore = filledCount > 0
    ? Math.round(Object.values(scores).filter((v): v is number => !!v).reduce((a, b) => a + b, 0) / filledCount)
    : 0;

  const mutation = useMutation({
    mutationFn: () => api.post('/ratings', {
      tripId, toUserId, toCompanyId, comment: comment || undefined, ...scores,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-has-rated', tripId] });
      queryClient.invalidateQueries({ queryKey: ['ratings-company', toCompanyId] });
      setSuccess(true);
    },
  });

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">¡Gracias por calificar!</h3>
          <p className="text-sm text-gray-500">
            Tu opinión ayuda a mejorar la comunidad de Logiguay.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: '#15A66A' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Calificar a {toName}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {raterRole === 'DADOR' ? 'Transportista' : 'Dador de carga'} · Viaje finalizado
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Score preview */}
        {avgScore > 0 && (
          <div className="mx-6 mt-4 px-4 py-2.5 rounded-xl flex items-center gap-3" style={{ backgroundColor: '#f0faf5' }}>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map((n) => (
                <Star key={n} className="h-5 w-5" fill={n <= avgScore ? '#FBBF24' : 'none'} stroke={n <= avgScore ? '#FBBF24' : '#d1d5db'} />
              ))}
            </div>
            <span className="text-sm font-semibold" style={{ color: '#15A66A' }}>
              {avgScore}/5 — {SCORE_LABELS[avgScore]}
            </span>
          </div>
        )}

        {/* Categories */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-0">
          {cats.map(({ key, label, desc }) => (
            <StarRow
              key={key}
              label={label}
              desc={desc}
              value={scores[key as CatKey] ?? 0}
              onChange={(v) => setScores((prev) => ({ ...prev, [key]: v }))}
            />
          ))}

          {/* Comment */}
          <div className="pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Comentario <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Contá tu experiencia para ayudar a otros usuarios..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={filledCount === 0 || mutation.isPending}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: '#15A66A' }}
          >
            {mutation.isPending ? 'Enviando...' : 'Enviar calificación'}
          </button>
        </div>

        {mutation.isError && (
          <p className="px-6 pb-3 text-xs text-red-500 text-center">
            Ocurrió un error. Intentá nuevamente.
          </p>
        )}
      </div>
    </div>
  );
}
