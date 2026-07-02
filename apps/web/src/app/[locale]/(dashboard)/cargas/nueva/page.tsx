'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from '@/i18n/routing';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Map as MapIcon } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

const LocationPicker = dynamic(() => import('@/components/ui/LocationPicker'), { ssr: false });
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { useAuth } from '@/hooks/useAuth';
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

// Para granel y cargas pesadas la medida natural es la tonelada; para cargas
// voluminosas, el m³. Según el tipo elegido mostramos la medida principal y
// dejamos la otra como opcional.
const VOLUME_FIRST_TYPES = ['General', 'Refrigerados', 'Otro', 'Peligrosa'];
function primaryUnit(type?: string): 'tons' | 'volume' {
  return type && VOLUME_FIRST_TYPES.includes(type) ? 'volume' : 'tons';
}

// Los inputs numéricos con valueAsNumber devuelven NaN cuando quedan vacíos:
// lo normalizamos a undefined para que los campos opcionales no bloqueen el envío.
const optionalNumber = <T extends z.ZodTypeAny>(validator: T) =>
  z.preprocess((v) => (typeof v === 'number' && Number.isNaN(v) ? undefined : v), validator) as unknown as T;

const schema = z
  .object({
    type: z.string().min(1, 'Requerido'),
    description: z.string().optional(),
    weightTons: optionalNumber(z.number({ invalid_type_error: 'Debe ser un número' }).positive().optional()),
    volumeM3: optionalNumber(z.number({ invalid_type_error: 'Debe ser un número' }).positive().optional()),
    originAddress: z.string().min(5, 'Dirección de origen requerida'),
    originLat: optionalNumber(z.number({ invalid_type_error: 'Debe ser un número' }).optional()),
    originLng: optionalNumber(z.number({ invalid_type_error: 'Debe ser un número' }).optional()),
    destinationAddress: z.string().min(5, 'Dirección de destino requerida'),
    destinationLat: optionalNumber(z.number({ invalid_type_error: 'Debe ser un número' }).optional()),
    destinationLng: optionalNumber(z.number({ invalid_type_error: 'Debe ser un número' }).optional()),
    requiredDate: z.string().optional(),
    estimatedValue: optionalNumber(z.number({ invalid_type_error: 'Debe ser un número' }).positive().optional()),
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
  const { user } = useAuth();
  const [isAuction, setIsAuction] = useState(false);
  const [showOriginMap, setShowOriginMap] = useState(false);
  const [showDestMap, setShowDestMap] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isAuction: false },
  });

  const cargoType = watch('type');
  const unit = primaryUnit(cargoType);
  const [showSecondaryMeasure, setShowSecondaryMeasure] = useState(false);

  const originAddress = watch('originAddress') ?? '';
  const destinationAddress = watch('destinationAddress') ?? '';
  const originLat = watch('originLat');
  const originLng = watch('originLng');
  const destinationLat = watch('destinationLat');
  const destinationLng = watch('destinationLng');

  const createMutation = useMutation({
    mutationFn: async ({ data, publish }: { data: FormData; publish: boolean }) => {
      const res = await api.post('/cargo', {
        ...data,
        companyId: user?.companyId,
        // draft: la carga queda en PENDIENTE y no aparece en la bolsa
        draft: !publish,
      });
      return res.data;
    },
    onSuccess: () => {
      router.push('/cargas');
    },
  });

  const onSaveDraft = handleSubmit((data) => {
    createMutation.mutate({ data, publish: false });
  });

  const onPublish = handleSubmit((data) => {
    createMutation.mutate({ data, publish: true });
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
            {(createMutation.error as any)?.response?.data?.message || 'Error al crear la carga. Intentá de nuevo.'}
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

          {/* Peso / volumen: la medida principal depende del tipo de carga */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              {unit === 'tons' ? (
                <Input
                  label="Peso (toneladas)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  error={errors.weightTons?.message}
                  {...register('weightTons', { valueAsNumber: true })}
                />
              ) : (
                <Input
                  label="Volumen (m³)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  error={errors.volumeM3?.message}
                  {...register('volumeM3', { valueAsNumber: true })}
                />
              )}

              {showSecondaryMeasure &&
                (unit === 'tons' ? (
                  <Input
                    label="Volumen (m³) — opcional"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    error={errors.volumeM3?.message}
                    {...register('volumeM3', { valueAsNumber: true })}
                  />
                ) : (
                  <Input
                    label="Peso (toneladas) — opcional"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    error={errors.weightTons?.message}
                    {...register('weightTons', { valueAsNumber: true })}
                  />
                ))}
            </div>
            {!showSecondaryMeasure && (
              <button
                type="button"
                onClick={() => setShowSecondaryMeasure(true)}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                + Agregar {unit === 'tons' ? 'volumen (m³)' : 'peso (toneladas)'} (opcional)
              </button>
            )}
          </div>

          {/* Origen */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Origen</h3>
              <button
                type="button"
                onClick={() => setShowOriginMap((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <MapIcon className="h-3.5 w-3.5" />
                {showOriginMap ? 'Ocultar mapa' : 'Marcar en el mapa'}
              </button>
            </div>
            <AddressAutocomplete
              label="Dirección"
              required
              value={originAddress}
              onChange={(addr) => setValue('originAddress', addr, { shouldValidate: true })}
              onCoords={(lat, lng) => {
                setValue('originLat', lat);
                setValue('originLng', lng);
              }}
              error={errors.originAddress?.message}
            />
            {showOriginMap && (
              <LocationPicker
                lat={originLat}
                lng={originLng}
                onPick={(lat, lng, address) => {
                  setValue('originLat', lat);
                  setValue('originLng', lng);
                  if (address) setValue('originAddress', address, { shouldValidate: true });
                }}
              />
            )}
            {originLat != null && originLng != null && (
              <p className="text-xs text-gray-400">
                Coords: {originLat.toFixed(5)}, {originLng.toFixed(5)}
              </p>
            )}
          </div>

          {/* Destino */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Destino</h3>
              <button
                type="button"
                onClick={() => setShowDestMap((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <MapIcon className="h-3.5 w-3.5" />
                {showDestMap ? 'Ocultar mapa' : 'Marcar en el mapa'}
              </button>
            </div>
            <AddressAutocomplete
              label="Dirección"
              required
              value={destinationAddress}
              onChange={(addr) => setValue('destinationAddress', addr, { shouldValidate: true })}
              onCoords={(lat, lng) => {
                setValue('destinationLat', lat);
                setValue('destinationLng', lng);
              }}
              error={errors.destinationAddress?.message}
            />
            {showDestMap && (
              <LocationPicker
                lat={destinationLat}
                lng={destinationLng}
                onPick={(lat, lng, address) => {
                  setValue('destinationLat', lat);
                  setValue('destinationLng', lng);
                  if (address) setValue('destinationAddress', address, { shouldValidate: true });
                }}
              />
            )}
            {destinationLat != null && destinationLng != null && (
              <p className="text-xs text-gray-400">
                Coords: {destinationLat.toFixed(5)}, {destinationLng.toFixed(5)}
              </p>
            )}
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
