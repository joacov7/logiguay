'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
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

const schema = z.object({
  type: z.string().min(1, 'Requerido'),
  description: z.string().optional(),
  weightTons: z.number().optional(),
  volumeM3: z.number().optional(),
  originAddress: z.string().min(5, 'Requerido'),
  destinationAddress: z.string().min(5, 'Requerido'),
  requiredDate: z.string().optional(),
  estimatedValue: z.number().optional(),
  observations: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NuevaCargaPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await api.post('/cargo', {
        ...data,
        companyId: 'placeholder', // Get from auth context in production
      });
      return res.data;
    },
    onSuccess: () => {
      router.push('/cargas');
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/cargas">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva carga</h1>
          <p className="text-sm text-gray-500">Publicar una nueva carga de transporte</p>
        </div>
      </div>

      <Card>
        {mutation.isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-6">
            Error al crear la carga. Intentá de nuevo.
          </div>
        )}

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de carga <span className="text-red-500">*</span>
              </label>
              <select
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('type')}
              >
                <option value="">Seleccionar...</option>
                <option value="Granos">Granos</option>
                <option value="Combustible">Combustible</option>
                <option value="Materiales">Materiales de construcción</option>
                <option value="Refrigerados">Refrigerados</option>
                <option value="Maquinaria">Maquinaria</option>
                <option value="General">Carga general</option>
                <option value="Peligrosa">Carga peligrosa</option>
              </select>
              {errors.type && <p className="text-xs text-red-600 mt-1">{errors.type.message}</p>}
            </div>

            <div className="col-span-2">
              <Input
                label="Descripción"
                placeholder="Descripción detallada de la carga"
                {...register('description')}
              />
            </div>

            <Input
              label="Peso (toneladas)"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('weightTons', { valueAsNumber: true })}
            />
            <Input
              label="Volumen (m³)"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('volumeM3', { valueAsNumber: true })}
            />
          </div>

          <Input
            label="Dirección de origen"
            placeholder="Calle, número, ciudad"
            required
            error={errors.originAddress?.message}
            {...register('originAddress')}
          />
          <Input
            label="Dirección de destino"
            placeholder="Calle, número, ciudad"
            required
            error={errors.destinationAddress?.message}
            {...register('destinationAddress')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha requerida"
              type="date"
              {...register('requiredDate')}
            />
            <Input
              label="Valor estimado (ARS)"
              type="number"
              step="0.01"
              {...register('estimatedValue', { valueAsNumber: true })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Información adicional importante para los transportistas"
              {...register('observations')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link href="/cargas">
              <Button variant="outline">Cancelar</Button>
            </Link>
            <Button type="submit" loading={mutation.isPending}>
              Guardar carga
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
