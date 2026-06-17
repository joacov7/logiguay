'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from '@/i18n/routing';
import {
  LayoutDashboard,
  Package,
  Truck,
  Users,
  MapPin,
  Bell,
  FileText,
  CreditCard,
  ShoppingBag,
  Navigation,
  LogOut,
  Crown,
  ShieldCheck,
  ArrowLeftRight,
  Calendar,
  TruckIcon,
  LineChart,
  Star,
  UserCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type Role = 'DADOR' | 'TRANSPORTISTA' | 'CHOFER' | 'ADMIN';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',   label: 'Dashboard',         icon: LayoutDashboard },
  { href: '/cargas',      label: 'Cargas',             icon: Package,      roles: ['DADOR', 'ADMIN'] },
  { href: '/bolsa',       label: 'Bolsa de Cargas',    icon: ShoppingBag,  roles: ['TRANSPORTISTA', 'DADOR', 'ADMIN'] },
  { href: '/viajes',      label: 'Viajes',             icon: Navigation,   roles: ['TRANSPORTISTA', 'DADOR', 'ADMIN'] },
  { href: '/flota',       label: 'Flota',              icon: Truck,        roles: ['TRANSPORTISTA', 'ADMIN'] },
  { href: '/choferes',    label: 'Choferes',           icon: Users,        roles: ['TRANSPORTISTA', 'ADMIN'] },
  { href: '/tracking',    label: 'Tracking',           icon: MapPin,       roles: ['TRANSPORTISTA', 'ADMIN'] },
  { href: '/documentos',  label: 'Documentos',         icon: FileText,     roles: ['TRANSPORTISTA', 'ADMIN'] },
  { href: '/reputacion',  label: 'Reputación',         icon: Star,         roles: ['DADOR', 'TRANSPORTISTA', 'ADMIN'] },
  { href: '/alertas',     label: 'Alertas',            icon: Bell },
  { href: '/facturacion', label: 'Facturación',        icon: CreditCard,   roles: ['TRANSPORTISTA', 'ADMIN'] },
  { href: '/suscripcion', label: 'Suscripción',        icon: Crown },
  { href: '/mi-viaje',    label: 'Mi Viaje',           icon: Navigation,   roles: ['CHOFER'] },
  { href: '/retorno',     label: 'Retorno',            icon: ArrowLeftRight, roles: ['TRANSPORTISTA'] },
  { href: '/finanzas',    label: 'Mis Finanzas',       icon: LineChart,    roles: ['TRANSPORTISTA'] },
  { href: '/turnos',      label: 'Turnos',             icon: Calendar,     roles: ['TRANSPORTISTA', 'ADMIN'] },
  { href: '/camiones-disponibles', label: 'Camiones',  icon: TruckIcon,    roles: ['DADOR', 'ADMIN'] },
];

interface SidebarProps {
  onLogout?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ onLogout, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <>
      {/* Backdrop — mobile only */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside className={`
        fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white z-40
        flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:block
      `}>
        <div className="flex items-center p-5 border-b border-gray-700">
          <Image src="/logo-logiguay.png" alt="Logiguay" width={140} height={42} className="h-9 w-auto brightness-0 invert" />
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {NAV_ITEMS.filter(({ roles }) => !roles || roles.includes((user?.role ?? '') as Role)).map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {user?.role === 'ADMIN' && (
          <div className="px-4 pb-2">
            <Link
              href="/admin"
              onClick={onClose}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors
                ${pathname === '/admin' || pathname.startsWith('/admin/')
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Administración
            </Link>
          </div>
        )}

        <div className="p-4 border-t border-gray-700 space-y-1">
          <Link
            href="/perfil"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/perfil' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <UserCircle className="h-4 w-4 shrink-0" />
            Mi perfil
          </Link>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
