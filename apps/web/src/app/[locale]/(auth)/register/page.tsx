'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Truck, Package } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

function validateCuit(cuit: string): boolean {
  const digits = cuit.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  const coefs = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = coefs.reduce((acc, c, i) => acc + c * Number(digits[i]), 0);
  const rem = sum % 11;
  const check = rem === 0 ? 0 : rem === 1 ? 9 : 11 - rem;
  return check === Number(digits[10]);
}

function formatCuit(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}

const schema = z.object({
  firstName: z.string().min(2, 'Requerido'),
  lastName: z.string().min(2, 'Requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  companyName: z.string().min(2, 'Razón social requerida'),
  cuit: z.string()
    .min(1, 'CUIT requerido')
    .refine((v) => validateCuit(v), { message: 'CUIT inválido. Verificá el número.' }),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
  role: z.enum(['DADOR', 'TRANSPORTISTA'], { required_error: 'Seleccioná un rol' }),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

const ROLES = [
  {
    value: 'DADOR' as const,
    icon: Package,
    title: 'Dador de carga',
    description: 'Publico cargas y busco transportistas para moverlas',
  },
  {
    value: 'TRANSPORTISTA' as const,
    icon: Truck,
    title: 'Transportista',
    description: 'Tengo camiones y busco cargas para transportar',
  },
];

export default function RegisterPage() {
  const { register: authRegister } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [cuitValue, setCuitValue] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const selectedRole = watch('role');

  const handleCuitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCuit(e.target.value);
    setCuitValue(formatted);
    setValue('cuit', formatted, { shouldValidate: true });
  };

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await authRegister({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        companyName: data.companyName,
        cuit: data.cuit.replace(/\D/g, ''),
      } as any);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al registrarse');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Crear cuenta</h1>
          <p className="text-gray-500 text-sm mt-1">Registrate en LOGIGUAY gratis</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Role selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ¿Cómo vas a usar Logiguay? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map(({ value, icon: Icon, title, description }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('role', value, { shouldValidate: true })}
                  className={`flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all ${
                    selectedRole === value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
                    selectedRole === value ? 'bg-blue-600' : 'bg-gray-100'
                  }`}>
                    <Icon className={`h-5 w-5 ${selectedRole === value ? 'text-white' : 'text-gray-500'}`} />
                  </div>
                  <span className={`text-sm font-semibold ${selectedRole === value ? 'text-blue-700' : 'text-gray-700'}`}>
                    {title}
                  </span>
                  <span className="text-xs text-gray-400 mt-1 leading-tight">{description}</span>
                </button>
              ))}
            </div>
            {errors.role && (
              <p className="text-xs text-red-500 mt-1">{errors.role.message}</p>
            )}
          </div>

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
            label="Razón social / Empresa"
            required
            placeholder="Ej: Transportes García S.R.L."
            error={errors.companyName?.message}
            {...register('companyName')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CUIT <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="20-12345678-9"
              value={cuitValue}
              onChange={handleCuitChange}
              className={`block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.cuit ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {errors.cuit ? (
              <p className="text-xs text-red-500 mt-1">{errors.cuit.message}</p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">Formato: XX-XXXXXXXX-X</p>
            )}
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
