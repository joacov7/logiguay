'use client';

import React, { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/api';

const CARGO_TYPES = [
  { value: 'Cereal', label: 'Cereal' },
  { value: 'Fertilizante', label: 'Fertilizante' },
  { value: 'Maquinaria', label: 'Maquinaria' },
  { value: 'General', label: 'General' },
  { value: 'Otro', label: 'Otro' },
  { value: 'Granos', label: 'Granos' },
  { value: 'Combustible', label: 'Combustible' },
  { value: 'Materiales', label: 'Materiales de construcción' },
  { value: 'Refrigerados', label: 'Refrigerados' },
  { value: 'Peligrosa', label: 'Carga peligrosa' },
];

const schema = z
  .object({
    type: z.string().min(1, 'Requerido'),
    description: z.string().optional(),
    weightTons: z.number({ invalid_type_error: 'Debe ser un número' }).positive().optional(),
    volumeM3: z.number({ invalid_type_error: 'Debe ser un número' }).positive().optional(),
    originAddress: z.string().min(5, 'Dirección de origen requerida'),
    originLat: z.number({ invalid_type_error: 'Debe ser un número' }).optional(),
    originLng: z.number({ invalid_type_error: 'Debe ser un número' }).optional(),
    destinationAddress: z.string().min(5, 'Dirección de destino requerida'),
    destinationLat: z.number({ invalid_type_error: 'Debe ser un número' }).optional(),
    destinationLng: z.number({ invalid_type_error: 'Debe ser un número' }).optional(),
    requiredDate: z.string().optional(),
    estimatedValue: z.number({ invalid_type_error: 'Debe ser un número' }).positive().optional(),
    observations: z.string().optional(),
    isAuction: z.boolean().optional(),
    auctionEndsAt: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.isAuction && !data.auctionEndsAt) return false;
      return true;
    },
    { message: 'La fecha límite de ofertas es requerida para subasta', path: ['auctionEndsAt'] },
  );

type FormData = z.infer<typeof schema>;

export default function NuevaCargaPage() {
  const router = useRouter();
  const [isAuction, setIsAuction] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isAuction: false },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData & { publish?: boolean }) => {
      const { publish, ...cargoData } = data;
      const res = await api.post('/cargo', {
        ...cargoData,
        companyId: 'placeholder',
      });
      return { cargo: res.data, publish };
    },
    onSuccess: async ({ cargo, publish }) => {
      if (publish) {
        await api.patch(`/cargo/${cargo.id}/publish`);
      }
      router.push('/cargas');
    },
  });

  const onSaveDraft = handleSubmit((data) => {
    createMutation.mutate({ ...data, publish: false });
  });

  const onPublish = handleSubmit((data) => {
    createMutation.mutate({ ...data, publish: true });
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/cargas">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva carga</h1>
          <p className="text-sm text-gray-500">Publicar una nueva carga de transporte</p>
        </div>
      </div>

      <Card>
        {createMutation.isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-6">
            Error al crear la carga. Intentá de nuevo.
          </div>
        )}

        <form className="space-y-5">
          {/* Tipo de carga */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de carga <span className="text-red-500">*</span>
            </label>
            <select
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register('type')}
            >
              <option value="">Seleccionar...</option>
              {CARGO_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {errors.type && <p className="text-xs text-red-600 mt-1">{errors.type.message}</p>}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Descripción detallada de la carga"
              {...register('description')}
            />
          </div>

          {/* Peso y volumen */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Peso (toneladas)"
              type="number"
              step="0.01"
              placeholder="0.00"
              error={errors.weightTons?.message}
              {...register('weightTons', { valueAsNumber: true })}
            />
            <Input
              label="Volumen (m³)"
              type="number"
              step="0.01"
              placeholder="0.00"
              error={errors.volumeM3?.message}
              {...register('volumeM3', { valueAsNumber: true })}
            />
          </div>

          {/* Origen */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Origen</h3>
            <Input
              label="Dirección"
              placeholder="Calle, número, ciudad"
              required
              error={errors.originAddress?.message}
              {...register('originAddress')}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Latitud"
                type="number"
                step="0.000001"
                placeholder="-34.6037"
                error={errors.originLat?.message}
                {...register('originLat', { valueAsNumber: true })}
              />
              <Input
                label="Longitud"
                type="number"
                step="0.000001"
                placeholder="-58.3816"
                error={errors.originLng?.message}
                {...register('originLng', { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Destino */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Destino</h3>
            <Input
              label="Dirección"
              placeholder="Calle, número, ciudad"
              required
              error={errors.destinationAddress?.message}
              {...register('destinationAddress')}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Latitud"
                type="number"
                step="0.000001"
                placeholder="-34.6037"
                error={errors.destinationLat?.message}
                {...register('destinationLat', { valueAsNumber: true })}
              />
              <Input
                label="Longitud"
                type="number"
                step="0.000001"
                placeholder="-58.3816"
                error={errors.destinationLng?.message}
                {...register('destinationLng', { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Fecha requerida y valor */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha requerida"
              type="date"
              error={errors.requiredDate?.message}
              {...register('requiredDate')}
            />
            <Input
              label="Valor estimado (ARS)"
              type="number"
              step="0.01"
              error={errors.estimatedValue?.message}
              {...register('estimatedValue', { valueAsNumber: true })}
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Información adicional para los transportistas"
              {...register('observations')}
            />
          </div>

          {/* Subasta toggle */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">¿Es subasta?</p>
                <p className="text-xs text-gray-500">Los transportistas compiten hasta la fecha límite</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !isAuction;
                  setIsAuction(next);
                  setValue('isAuction', next);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isAuction ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    isAuction ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {isAuction && (
              <Input
                label="Fecha límite de ofertas"
                type="datetime-local"
                error={errors.auctionEndsAt?.message}
                {...register('auctionEndsAt')}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link href="/cargas">
              <Button variant="outline" type="button">Cancelar</Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              loading={createMutation.isPending}
              onClick={onSaveDraft}
            >
              Guardar como borrador
            </Button>
            <Button
              type="button"
              loading={createMutation.isPending}
              onClick={onPublish}
            >
              Publicar ahora
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
