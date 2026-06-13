'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard, Package, Truck, Users, MapPin, Bell,
  FileText, CreditCard, ShoppingBag, Navigation, LogOut,
  Crown, ShieldCheck, ArrowLeftRight, Calendar, TruckIcon, X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { href: '/operaciones', key: 'operaciones', icon: LayoutDashboard },
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

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'U';
  const displayName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '';

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: 'rgba(0,0,0,.45)' }}
          onClick={onClose}
        />
      )}
      <aside
        className={`
          fixed left-0 top-0 h-screen w-64 z-40 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:block
        `}
        style={{ background: 'linear-gradient(185deg, #0E1E44, #0A1633 60%)', borderRight: '1px solid rgba(255,255,255,.09)' }}
      >
        {/* brand */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-3">
          <span style={{
            width: 36, height: 36, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(135deg, #3B6BFF, #2456E6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Truck size={18} color="#fff" />
          </span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: '#EAF0FF', letterSpacing: '-.01em' }}>
            Logiguay
          </span>
          <button
            onClick={onClose}
            className="ml-auto lg:hidden"
            style={{ background: 'none', border: 'none', color: '#93A3C9', cursor: 'pointer', padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* section label */}
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 500,
          letterSpacing: '.12em', textTransform: 'uppercase', color: '#93A3C9',
          padding: '4px 20px 14px', borderBottom: '1px solid rgba(255,255,255,.09)',
        }}>
          Centro de operaciones
        </div>

        {/* nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2.5">
          {navItems.map(({ href, key, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 11px', borderRadius: 11,
                  color: active ? '#fff' : '#93A3C9',
                  background: active ? 'rgba(255,255,255,.06)' : 'none',
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: 14.5, fontWeight: 500,
                  textDecoration: 'none',
                  marginBottom: 1, position: 'relative',
                  transition: 'background .15s, color .15s',
                  borderLeft: active ? '3px solid #3B6BFF' : '3px solid transparent',
                }}
                className="sidebar-link"
              >
                <Icon size={18} color={active ? '#3B6BFF' : undefined} />
                {t(key)}
              </Link>
            );
          })}

          {user?.role === 'TRANSPORTISTA' && (
            <Link href="/retorno" onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 11px', borderRadius: 11,
                color: pathname === '/retorno' ? '#fff' : '#93A3C9',
                background: pathname === '/retorno' ? 'rgba(255,255,255,.06)' : 'none',
                fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14.5, fontWeight: 500,
                textDecoration: 'none', marginBottom: 1, position: 'relative',
                borderLeft: pathname === '/retorno' ? '3px solid #3B6BFF' : '3px solid transparent',
              }}
            >
              <ArrowLeftRight size={18} />Retorno
            </Link>
          )}
          <Link href="/turnos" onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 11px', borderRadius: 11,
              color: pathname === '/turnos' ? '#fff' : '#93A3C9',
              background: pathname === '/turnos' ? 'rgba(255,255,255,.06)' : 'none',
              fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14.5, fontWeight: 500,
              textDecoration: 'none', marginBottom: 1, position: 'relative',
              borderLeft: pathname === '/turnos' ? '3px solid #3B6BFF' : '3px solid transparent',
            }}
          >
            <Calendar size={18} />Turnos
          </Link>
          <Link href="/camiones-disponibles" onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 11px', borderRadius: 11,
              color: pathname === '/camiones-disponibles' ? '#fff' : '#93A3C9',
              background: pathname === '/camiones-disponibles' ? 'rgba(255,255,255,.06)' : 'none',
              fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14.5, fontWeight: 500,
              textDecoration: 'none', marginBottom: 1, position: 'relative',
              borderLeft: pathname === '/camiones-disponibles' ? '3px solid #3B6BFF' : '3px solid transparent',
            }}
          >
            <TruckIcon size={18} />Camiones
          </Link>
        </nav>

        {user?.role === 'ADMIN' && (
          <div className="px-2.5 pb-1">
            <Link href="/admin" onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 11px', borderRadius: 11,
                color: pathname.startsWith('/admin') ? '#fff' : '#93A3C9',
                background: pathname.startsWith('/admin') ? 'rgba(255,255,255,.06)' : 'none',
                fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14.5, fontWeight: 500,
                textDecoration: 'none',
                borderLeft: pathname.startsWith('/admin') ? '3px solid #3B6BFF' : '3px solid transparent',
              }}
            >
              <ShieldCheck size={18} />Administración
            </Link>
          </div>
        )}

        {/* footer */}
        <div style={{ padding: '12px 16px 18px', borderTop: '1px solid rgba(255,255,255,.09)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{
              width: 36, height: 36, borderRadius: 999, flexShrink: 0,
              background: 'linear-gradient(135deg, #3B6BFF, #2456E6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, color: '#fff',
            }}>
              {initials || <Users size={16} />}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#EAF0FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                {displayName || 'Usuario'}
              </div>
              <div style={{ fontSize: 12, color: '#93A3C9' }}>
                {user?.role?.toLowerCase() ?? ''}
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '8px 11px', borderRadius: 11, border: 'none', cursor: 'pointer',
              background: 'none', color: '#93A3C9', fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 14, fontWeight: 500, transition: 'background .15s, color .15s',
            }}
            className="sidebar-logout"
          >
            <LogOut size={16} />
            {t('logout')}
          </button>
        </div>
      </aside>

      <style>{`
        .sidebar-link:hover { background: rgba(255,255,255,.06) !important; color: #EAF0FF !important; }
        .sidebar-logout:hover { background: rgba(255,255,255,.06) !important; color: #EAF0FF !important; }
      `}</style>
    </>
  );
}
