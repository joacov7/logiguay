'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';

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
}

export function Sidebar({ onLogout }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <aside className="flex flex-col w-64 h-screen bg-gray-900 text-white fixed left-0 top-0 z-40">
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
        </ul>
      </nav>

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
  );
}
