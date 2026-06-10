'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, Users, ClipboardList, DollarSign, Settings, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';

const sections = [
  {
    href: '/admin/empresas',
    icon: Building2,
    title: 'Empresas',
    description: 'Gestionar empresas registradas',
    color: 'bg-blue-50 text-blue-700',
  },
  {
    href: '/admin/usuarios',
    icon: Users,
    title: 'Usuarios',
    description: 'Gestionar usuarios del sistema',
    color: 'bg-indigo-50 text-indigo-700',
  },
  {
    href: '/admin/suscripciones',
    icon: ClipboardList,
    title: 'Suscripciones',
    description: 'Planes y suscripciones activas',
    color: 'bg-green-50 text-green-700',
  },
  {
    href: '/admin/comisiones',
    icon: DollarSign,
    title: 'Comisiones',
    description: 'Configurar comisiones por viaje',
    color: 'bg-amber-50 text-amber-700',
  },
  {
    href: '/admin/configuracion',
    icon: Settings,
    title: 'Configuración',
    description: 'Parámetros generales del sistema',
    color: 'bg-gray-50 text-gray-700',
  },
];

export default function AdminPage() {
  const { user } = useAuth();

  if (user && user.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-gray-800">Acceso denegado</h2>
        <p className="text-gray-500">No tenés permisos para acceder al panel de administración.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
        <p className="text-gray-500 mt-1">Gestioná todos los recursos de la plataforma.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {sections.map(({ href, icon: Icon, title, description, color }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-base">{title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
