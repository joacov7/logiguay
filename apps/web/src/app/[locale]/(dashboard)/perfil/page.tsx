'use client';

import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Building2, Save, MessageCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

const profileSchema = z.object({
  firstName: z.string().min(1, 'Requerido'),
  lastName: z.string().min(1, 'Requerido'),
  phone: z.string().optional(),
  country: z.string().optional(),
  language: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
});

const companySchema = z.object({
  name: z.string().min(1, 'Requerido'),
  razonSocial: z.string().optional(),
  cuit: z.string().optional(),
  condicionFiscal: z.string().optional(),
  address: z.string().optional(),
});

const CONDICION_FISCAL_OPTIONS = [
  { value: 'NO_DECLARADA', label: 'Sin declarar' },
  { value: 'RESPONSABLE_INSCRIPTO', label: 'Responsable Inscripto' },
  { value: 'MONOTRIBUTO', label: 'Monotributo' },
  { value: 'EXENTO', label: 'Exento' },
  { value: 'CONSUMIDOR_FINAL', label: 'Consumidor Final' },
];

type ProfileForm = z.infer<typeof profileSchema>;
type CompanyForm = z.infer<typeof companySchema>;

export default function PerfilPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data;
    },
  });

  const { data: companies } = useQuery({
    queryKey: ['my-companies'],
    queryFn: async () => {
      const res = await api.get('/companies/mine');
      // Response: [{ companyId, company: { id, name, address, ... } }]
      return (res.data as {
        company: {
          id: string;
          name: string;
          address?: string;
          razonSocial?: string;
          cuit?: string;
          condicionFiscal?: string;
        };
      }[]).map((cu) => cu.company);
    },
  });

  const company = companies?.[0];

  const {
    register: regProfile,
    handleSubmit: handleProfile,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });

  const {
    register: regCompany,
    handleSubmit: handleCompany,
    reset: resetCompany,
    formState: { errors: companyErrors },
  } = useForm<CompanyForm>({ resolver: zodResolver(companySchema) });

  useEffect(() => {
    if (me) {
      resetProfile({
        firstName: me.firstName ?? '',
        lastName: me.lastName ?? '',
        phone: me.phone ?? '',
        country: me.country ?? '',
        language: me.language ?? '',
        currency: me.currency ?? '',
        timezone: me.timezone ?? '',
      });
    }
  }, [me, resetProfile]);

  useEffect(() => {
    if (company) {
      resetCompany({
        name: company.name ?? '',
        razonSocial: company.razonSocial ?? '',
        cuit: company.cuit && !company.cuit.startsWith('00-') ? company.cuit : '',
        condicionFiscal: company.condicionFiscal ?? 'NO_DECLARADA',
        address: company.address ?? '',
      });
    }
  }, [company, resetCompany]);

  const profileMutation = useMutation({
    mutationFn: (data: ProfileForm) => api.put(`/users/${me?.id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });

  const companyMutation = useMutation({
    mutationFn: (data: CompanyForm) => api.put(`/companies/${company?.id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-companies'] }),
  });

  const createCompanyMutation = useMutation({
    mutationFn: (data: CompanyForm) =>
      api.post('/companies', { ...data, country: 'AR', planType: 'FREE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-companies'] }),
  });

  const fiscalFields = (
    <div className="border-t pt-4 mt-2">
      <p className="text-sm font-medium text-gray-700 mb-1">Datos fiscales</p>
      <p className="text-xs text-gray-400 mb-3">Necesarios para poder emitir facturas.</p>
      <div className="space-y-4">
        <Input label="Razón social" {...regCompany('razonSocial')} error={companyErrors.razonSocial?.message} placeholder="Transportes García S.R.L." />
        <div className="grid grid-cols-2 gap-4">
          <Input label="CUIT" {...regCompany('cuit')} error={companyErrors.cuit?.message} placeholder="20-12345678-9" />
          <div>
            <label className="text-sm font-medium text-gray-700">Condición fiscal</label>
            <select
              {...regCompany('condicionFiscal')}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CONDICION_FISCAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  if (meLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const initials = `${me?.firstName?.[0] ?? ''}${me?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-sm text-gray-500 mt-1">Administrá tu información personal y de empresa</p>
      </div>

      {/* Avatar + info */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {initials || <User className="h-7 w-7" />}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{me?.firstName} {me?.lastName}</p>
            <p className="text-sm text-gray-500">{me?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {me?.role}
            </span>
          </div>
        </div>
      </Card>

      {/* Personal data */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <User className="h-4 w-4 text-gray-500" />
          <h2 className="text-base font-semibold text-gray-900">Datos personales</h2>
        </div>
        <form onSubmit={handleProfile((data) => profileMutation.mutate(data))} className="space-y-4">
          {profileMutation.isSuccess && (
            <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">Datos actualizados correctamente.</p>
          )}
          {profileMutation.error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {(profileMutation.error as any)?.response?.data?.message || 'Error al guardar'}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre *" {...regProfile('firstName')} error={profileErrors.firstName?.message} />
            <Input label="Apellido *" {...regProfile('lastName')} error={profileErrors.lastName?.message} />
          </div>
          <Input label="Teléfono" {...regProfile('phone')} placeholder="+54 9 11..." error={profileErrors.phone?.message} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="País" {...regProfile('country')} placeholder="Argentina" error={profileErrors.country?.message} />
            <Input label="Moneda" {...regProfile('currency')} placeholder="ARS" error={profileErrors.currency?.message} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Idioma" {...regProfile('language')} placeholder="es" error={profileErrors.language?.message} />
            <Input label="Zona horaria" {...regProfile('timezone')} placeholder="America/Argentina/Buenos_Aires" error={profileErrors.timezone?.message} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={profileMutation.isPending}>
              <Save className="h-4 w-4 mr-1" />
              {profileMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Company */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-4 w-4 text-gray-500" />
          <h2 className="text-base font-semibold text-gray-900">Datos de empresa</h2>
        </div>
        {company ? (
          <form onSubmit={handleCompany((data) => companyMutation.mutate(data))} className="space-y-4">
            {companyMutation.isSuccess && (
              <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">Empresa actualizada correctamente.</p>
            )}
            {companyMutation.error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {(companyMutation.error as any)?.response?.data?.message || 'Error al guardar'}
              </p>
            )}
            <Input label="Nombre de empresa *" {...regCompany('name')} error={companyErrors.name?.message} />
            {fiscalFields}
            <Input label="Dirección" {...regCompany('address')} error={companyErrors.address?.message} />
            <div className="flex justify-end">
              <Button type="submit" disabled={companyMutation.isPending}>
                <Save className="h-4 w-4 mr-1" />
                {companyMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCompany((data) => createCompanyMutation.mutate(data))} className="space-y-4">
            <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              Todavía no tenés empresa registrada. Creá una para poder cotizar cargas.
            </p>
            {createCompanyMutation.isSuccess && (
              <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">¡Empresa creada! Ya podés cotizar cargas.</p>
            )}
            {createCompanyMutation.error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {(createCompanyMutation.error as any)?.response?.data?.message || 'Error al crear'}
              </p>
            )}
            <Input label="Nombre de empresa *" {...regCompany('name')} error={companyErrors.name?.message} />
            {fiscalFields}
            <Input label="Dirección" {...regCompany('address')} error={companyErrors.address?.message} />
            <div className="flex justify-end">
              <Button type="submit" disabled={createCompanyMutation.isPending}>
                <Save className="h-4 w-4 mr-1" />
                {createCompanyMutation.isPending ? 'Creando...' : 'Crear empresa'}
              </Button>
            </div>
          </form>
        )}
      </Card>

      <TelegramLinkCard />
    </div>
  );
}

function TelegramLinkCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['telegram-link'],
    queryFn: () => api.get('/telegram/link').then(r => r.data),
  });

  if (isLoading) return null;

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="p-2 bg-blue-50 rounded-lg shrink-0">
          <MessageCircle className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-semibold text-gray-800">Bot de Telegram</h2>
            {data?.linked && (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                <CheckCircle className="h-3 w-3" /> Vinculado
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-4">
            {data?.linked
              ? 'Tu cuenta está vinculada con Telegram. Podés publicar cargas mandando "carga" al bot.'
              : 'Vinculá tu cuenta para publicar cargas directamente desde Telegram sin abrir la web.'}
          </p>
          {!data?.linked && data?.url && (
            <a href={data.url} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm">
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Vincular con Telegram
              </Button>
            </a>
          )}
          {data?.linked && (
            <a href={`https://t.me/${data.botUsername}`} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm">
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Abrir bot
              </Button>
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
