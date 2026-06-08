'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/cargas', label: 'Cargas', icon: Package },
  { href: '/bolsa', label: 'Bolsa', icon: ShoppingBag },
  { href: '/viajes', label: 'Viajes', icon: Navigation },
  { href: '/flota', label: 'Flota', icon: Truck },
  { href: '/choferes', label: 'Choferes', icon: Users },
  { href: '/tracking', label: 'Tracking', icon: MapPin },
  { href: '/documentos', label: 'Documentos', icon: FileText },
  { href: '/alertas', label: 'Alertas', icon: Bell },
  { href: '/facturacion', label: 'Facturación', icon: CreditCard },
];

interface SidebarProps {
  onLogout?: () => void;
}

export function Sidebar({ onLogout }: SidebarProps) {
  const pathname = usePathname();

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
          {navItems.map(({ href, label, icon: Icon }) => {
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
                  {label}
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
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
