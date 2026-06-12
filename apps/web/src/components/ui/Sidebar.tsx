'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
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
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { href: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
  { href: '/cargas', key: 'cargas', icon: Package },
  { href: '/bolsa', key: 'bolsa', icon: ShoppingBag },
  { href: '/viajes', key: 'viajes', icon: Navigation },
  { href: '/flota', key: 'flota', icon: Truck },
  { href: '/choferes', key: 'choferes', icon: Users },
  { href: '/tracking', key: 'tracking', icon: MapPin },
  { href: '/documentos', key: 'documentos', icon: FileText },
  { href: '/alertas', key: 'alertas', icon: Bell },
  { href: '/facturacion', key: 'facturacion', icon: CreditCard },
  { href: '/suscripcion', key: 'suscripcion', icon: Crown },
] as const;

interface SidebarProps {
  onLogout?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ onLogout, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('nav');
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
        <div className="flex items-center gap-2 p-6 border-b border-gray-700">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold">LOGIGUAY</span>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map(({ href, key, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-colors
                      ${active
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {t(key)}
                  </Link>
                </li>
              );
            })}
            {(user?.role === 'TRANSPORTISTA') && (
              <li>
                <Link href="/retorno" onClick={onClose} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${pathname === '/retorno' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
                  <ArrowLeftRight className="h-4 w-4 shrink-0" />
                  Retorno
                </Link>
              </li>
            )}
            <li>
              <Link href="/turnos" onClick={onClose} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${pathname === '/turnos' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
                <Calendar className="h-4 w-4 shrink-0" />
                Turnos
              </Link>
            </li>
            <li>
              <Link href="/camiones-disponibles" onClick={onClose} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${pathname === '/camiones-disponibles' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
                <TruckIcon className="h-4 w-4 shrink-0" />
                Camiones
              </Link>
            </li>
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

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            {t('logout')}
          </button>
        </div>
      </aside>
    </>
  );
}
