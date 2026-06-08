'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, MapPin, Weight, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import api from '@/lib/api';
import { Cargo, PaginatedResponse } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function BolsaPage() {
  const [page, setPage] = useState(1);
  const [quotingCargoId, setQuotingCargoId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<PaginatedResponse<Cargo>>({
    queryKey: ['bolsa', page],
    queryFn: async () => {
      const res = await api.get(`/cargo/marketplace?page=${page}&limit=20`);
      return res.data;
    },
  });

  const quoteMutation = useMutation({
    mutationFn: async ({ cargoId, quoteAmount }: { cargoId: string; quoteAmount: number }) => {
      return api.post('/quotes', {
        cargoId,
        transportCompanyId: 'placeholder',
        amount: quoteAmount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bolsa'] });
      setQuotingCargoId(null);
      setAmount('');
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bolsa de cargas</h1>
        <p className="text-sm text-gray-500 mt-1">Cargas disponibles para cotizar</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : !data?.data.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <ShoppingBag className="h-12 w-12 mb-3 opacity-50" />
          <p className="font-medium">No hay cargas disponibles</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.data.map((cargo) => (
            <Card key={cargo.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{cargo.type}</p>
                  <p className="text-xs text-gray-500">{cargo.company?.name}</p>
                </div>
                <StatusBadge status={cargo.status} />
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-gray-600 line-clamp-1">{cargo.originAddress}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-gray-600 line-clamp-1">{cargo.destinationAddress}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                {cargo.weightTons && (
                  <span className="flex items-center gap-1">
                    <Weight className="h-3 w-3" />
                    {cargo.weightTons}t
                  </span>
                )}
                {cargo.estimatedValue && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    ${cargo.estimatedValue.toLocaleString('es-AR')}
                  </span>
                )}
                {cargo.requiredDate && (
                  <span>{format(new Date(cargo.requiredDate), 'dd MMM', { locale: es })}</span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                <span>{cargo._count?.quotes || 0} cotizaciones</span>
              </div>

              {quotingCargoId === cargo.id ? (
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Monto en ARS"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      loading={quoteMutation.isPending}
                      onClick={() =>
                        quoteMutation.mutate({
                          cargoId: cargo.id,
                          quoteAmount: parseFloat(amount),
                        })
                      }
                      disabled={!amount || isNaN(parseFloat(amount))}
                    >
                      Enviar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setQuotingCargoId(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => setQuotingCargoId(cargo.id)}
                >
                  Cotizar
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Anterior
          </Button>
          <span className="text-sm text-gray-500">Página {page} de {data.pages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.pages}>
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}
