'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Bell, User, Menu, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { User as UserType, Alert } from '../../types';
import { LanguageSelector } from './LanguageSelector';
import { api } from '@/lib/api';

interface NavbarProps {
  user?: UserType | null;
  unreadAlerts?: number;
  onMenuClick?: () => void;
}

export function Navbar({ user, unreadAlerts = 0, onMenuClick }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const companyId = (user as any)?.companyId as string | undefined;

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ['navbar-alerts', companyId],
    queryFn: async () => {
      const res = await api.get(`/alerts?companyId=${companyId}&limit=10`);
      return res.data?.data ?? res.data ?? [];
    },
    enabled: !!companyId && open,
    staleTime: 30_000,
  });

  const { data: allAlerts = [] } = useQuery<Alert[]>({
    queryKey: ['navbar-alerts-count', companyId],
    queryFn: async () => {
      const res = await api.get(`/alerts?companyId=${companyId}&limit=50`);
      return res.data?.data ?? res.data ?? [];
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  const actualUnread = allAlerts.filter((a) => !a.isRead).length;
  const badgeCount = companyId ? actualUnread : unreadAlerts;

  const markAllRead = useMutation({
    mutationFn: () => api.patch(`/alerts/read-all?companyId=${companyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['navbar-alerts', companyId] });
      queryClient.invalidateQueries({ queryKey: ['navbar-alerts-count', companyId] });
    },
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '';

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 px-6"
      style={{
        height: 64,
        background: 'rgba(245,248,253,.88)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        borderBottom: '1px solid rgba(12,26,51,.09)',
      }}
    >
      {/* hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 7, borderRadius: 9, color: '#5A6A87',
          display: 'flex', alignItems: 'center',
        }}
      >
        <Menu size={22} />
      </button>

      {/* search */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#fff', border: '1px solid rgba(12,26,51,.09)',
          borderRadius: 999, padding: '7px 14px',
          width: 340, maxWidth: '36vw',
          color: '#93A0BC',
          transition: 'border-color .15s, box-shadow .15s',
        }}
        className="navbar-search"
      >
        <Search size={15} />
        <input
          placeholder="Buscar viaje, camión, carga o chofer…"
          style={{
            border: 'none', background: 'none', outline: 'none',
            fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14,
            color: '#0C1A33', width: '100%',
          }}
        />
        <kbd style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#93A0BC',
          border: '1px solid rgba(12,26,51,.09)', borderRadius: 4, padding: '1px 5px',
          whiteSpace: 'nowrap',
        }}>⌘K</kbd>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <LanguageSelector />

        {/* bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((prev) => !prev)}
            style={{
              width: 40, height: 40, borderRadius: 999,
              background: 'none', border: '1px solid rgba(12,26,51,.09)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#5A6A87', position: 'relative',
              transition: 'background .15s',
            }}
            aria-label="Notificaciones"
          >
            <Bell size={18} />
            {badgeCount > 0 && (
              <span style={{
                position: 'absolute', top: 7, right: 7,
                width: 8, height: 8, borderRadius: 999,
                background: '#F2870D', border: '2px solid #F5F8FD',
              }} />
            )}
          </button>

          {open && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              width: 320, background: '#fff',
              border: '1px solid rgba(12,26,51,.09)',
              borderRadius: 14,
              boxShadow: '0 10px 26px -10px rgba(12,26,51,.18), 0 2px 6px -2px rgba(12,26,51,.08)',
              zIndex: 50, overflow: 'hidden',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderBottom: '1px solid rgba(12,26,51,.055)',
              }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: '#0C1A33' }}>
                  Notificaciones
                </span>
                {companyId && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    disabled={markAllRead.isPending || actualUnread === 0}
                    style={{ fontSize: 12, color: '#2456E6', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Marcar todas como leídas
                  </button>
                )}
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {alerts.length === 0 ? (
                  <p style={{ padding: '24px 16px', textAlign: 'center', fontSize: 14, color: '#93A0BC' }}>
                    No hay notificaciones recientes.
                  </p>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      style={{
                        padding: '10px 16px',
                        background: !alert.isRead ? 'rgba(36,86,230,.05)' : 'none',
                        borderBottom: '1px solid rgba(12,26,51,.055)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, fontWeight: 600, color: '#2456E6', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                          {alert.type}
                        </span>
                        <span style={{ fontSize: 11.5, color: '#93A0BC' }}>
                          {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p style={{ fontSize: 13.5, color: '#0C1A33' }}>{alert.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* user */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingLeft: 12, borderLeft: '1px solid rgba(12,26,51,.09)' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 999,
            background: 'linear-gradient(135deg, #3B6BFF, #2456E6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 700, color: '#fff',
          }}>
            {initials || <User size={16} />}
          </div>
          {user && (
            <div className="hidden sm:block">
              <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13.5, fontWeight: 600, color: '#0C1A33', lineHeight: 1.2 }}>
                {user.firstName} {user.lastName}
              </p>
              <p style={{ fontSize: 12, color: '#5A6A87', lineHeight: 1.2 }}>
                {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
              </p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
