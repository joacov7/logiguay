'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Truck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

const schema = z.object({
  firstName: z.string().min(2, 'Requerido'),
  lastName: z.string().min(2, 'Requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: authRegister } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await authRegister({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al registrarse');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Crear cuenta</h1>
          <p className="text-gray-500 text-sm mt-1">Registrate en LOGIGUAY gratis</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nombre"
              required
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label="Apellido"
              required
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>
          <Input
            label="Email"
            type="email"
            required
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Teléfono"
            type="tel"
            placeholder="+54 9 11..."
            error={errors.phone?.message}
            {...register('phone')}
          />
          <Input
            label="Contraseña"
            type="password"
            required
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="Confirmar contraseña"
            type="password"
            required
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button type="submit" className="w-full" loading={isSubmitting} size="lg">
            Registrarme
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-blue-600 font-medium hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
