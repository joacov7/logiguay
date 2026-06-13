'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

/* ── types ──────────────────────────────────────────────── */
type KpiData = { label: string; num: string; u?: string; icon: keyof typeof ICONS; trend: string; up: boolean; sub: string; spark: number[] };
type DockTrip = { code: string; rt: string; prog: number; eta: string; st: string; warn: boolean };
type TurnoData = { h: string; m: string; s: string; tag: 'green' | 'blue' | 'navy' };
type CargaData = { o: string; d: string; t: string; pay: string; of: string };
type AlertData = { k: 'warn' | 'info' | 'ok'; ic: keyof typeof ICONS; t: string; s: string; when: string };
type TripRow = { id: string; o: string; d: string; tipo: string; est: string; pill: 'green' | 'orange' | 'blue' | 'navy'; chofer: string; eta: string; prog: number };

/* ── icon paths ─────────────────────────────────────────── */
const ICONS = {
  dash: (
    <g>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </g>
  ),
  map: (
    <g>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </g>
  ),
  route: (
    <g>
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="18" cy="18" r="2.4" />
      <path d="M8 6h6a3 3 0 0 1 3 3v6" />
    </g>
  ),
  truck: (
    <g>
      <rect x="2" y="7" width="12" height="9" rx="1.5" />
      <path d="M14 10h4l3 3v3h-7" />
      <circle cx="7" cy="18" r="1.7" />
      <circle cx="17" cy="18" r="1.7" />
    </g>
  ),
  cal: (
    <g>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </g>
  ),
  box: (
    <g>
      <path d="M21 8 12 3 3 8l9 5 9-5Z" />
      <path d="M3 8v8l9 5 9-5V8M12 13v8" />
    </g>
  ),
  bill: (
    <g>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </g>
  ),
  bell: (
    <g>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </g>
  ),
  search: (
    <g>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4-4" />
    </g>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  clock: (
    <g>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </g>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  up: <path d="M7 17 17 7M9 7h8v8" />,
  down: <path d="M7 7l10 10M17 9v8H9" />,
  fuel: (
    <g>
      <path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M14 9h2.5a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3" />
    </g>
  ),
  alert: (
    <g>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 4 3 17a2 2 0 0 0 1.7 3h14.6a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0Z" />
    </g>
  ),
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />,
  grid: (
    <g>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </g>
  ),
  menu: (
    <g>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </g>
  ),
};

function Ic({ n, s = 18, style }: { n: keyof typeof ICONS; s?: number; style?: React.CSSProperties }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden>
      {ICONS[n]}
    </svg>
  );
}

/* ── mock data ──────────────────────────────────────────── */
const KPIS: KpiData[] = [
  { label: 'Viajes activos', num: '24', icon: 'route', trend: '+3', up: true, sub: 'vs. ayer', spark: [8, 10, 9, 13, 11, 16, 14, 18] },
  { label: 'Camiones en ruta', num: '18', u: '/ 26', icon: 'truck', trend: '69%', up: true, sub: 'ocupación', spark: [10, 12, 11, 14, 13, 15, 17, 18] },
  { label: 'Entregas a tiempo', num: '98', u: '%', icon: 'check', trend: '+2,1', up: true, sub: '7 días', spark: [92, 94, 93, 95, 96, 95, 97, 98] },
  { label: 'Facturación · jun', num: '$1,24', u: 'M', icon: 'bill', trend: '+12%', up: true, sub: 'vs. mayo', spark: [6, 7, 9, 8, 11, 10, 12, 13] },
];

const DOCK: DockTrip[] = [
  { code: 'LG-2029', rt: 'Montevideo → Mercedes', prog: 64, eta: '16:40', st: 'En tiempo', warn: false },
  { code: 'LG-2027', rt: 'Canelones → Pta. del Este', prog: 38, eta: '18:10', st: 'En tiempo', warn: false },
  { code: 'LG-2031', rt: 'Salto → Paysandú', prog: 82, eta: '15:05', st: '+12 min', warn: true },
  { code: 'LG-2026', rt: 'Salto → Montevideo', prog: 12, eta: '09:00 mñ', st: 'En tiempo', warn: false },
  { code: 'LG-2033', rt: 'Tacuarembó → Florida', prog: 48, eta: '17:25', st: 'En tiempo', warn: false },
  { code: 'LG-2030', rt: 'Rivera → Melo', prog: 71, eta: '16:10', st: '+5 min', warn: true },
];

const TURNOS: TurnoData[] = [
  { h: '08:30', m: 'Carga en acopio', s: 'Agrolatina · Salto', tag: 'green' },
  { h: '10:00', m: 'Retiro pallets', s: 'Frigorífico Mvd · Canelones', tag: 'blue' },
  { h: '13:15', m: 'Descarga planta', s: 'Cementos del Sur · Minas', tag: 'navy' },
  { h: '16:45', m: 'Carga granel', s: 'Cooperativa · Mercedes', tag: 'green' },
];

const CARGAS: CargaData[] = [
  { o: 'Paysandú', d: 'Montevideo', t: 'Granel · 28 t', pay: '$ 41.000', of: '2 ofertas' },
  { o: 'Colonia', d: 'Rocha', t: 'Pallets · 15 t', pay: '$ 35.200', of: '1 oferta' },
  { o: 'Rivera', d: 'Florida', t: 'General · 9 t', pay: '$ 26.800', of: '5 ofertas' },
  { o: 'Durazno', d: 'Maldonado', t: 'Refrigerada · 6 t', pay: '$ 19.400', of: '3 ofertas' },
];

const ALERTS: AlertData[] = [
  { k: 'warn', ic: 'clock', t: 'Demora en LG-2031', s: 'Salto → Paysandú · +12 min sobre ETA', when: 'ahora' },
  { k: 'warn', ic: 'fuel', t: 'Combustible bajo · SCD 3390', s: 'Nivel 14% · estación más cercana a 8 km', when: '6 min' },
  { k: 'info', ic: 'box', t: 'Nueva oferta en LG-2041', s: '$ 37.000 · J. Acosta', when: '14 min' },
  { k: 'ok', ic: 'check', t: 'Entrega confirmada LG-2019', s: 'Montevideo → Rivera · a tiempo', when: '38 min' },
];

const TRIPS: TripRow[] = [
  { id: 'LG-2029', o: 'Montevideo', d: 'Mercedes', tipo: 'Pallets · 10 t', est: 'En tránsito', pill: 'green', chofer: 'D. Píriz', eta: 'Hoy 16:40', prog: 64 },
  { id: 'LG-2031', o: 'Salto', d: 'Paysandú', tipo: 'Granel · 24 t', est: 'Demorado', pill: 'orange', chofer: 'M. Lima', eta: 'Hoy 15:05', prog: 82 },
  { id: 'LG-2027', o: 'Canelones', d: 'Punta del Este', tipo: 'Refrigerada · 5 t', est: 'En tránsito', pill: 'green', chofer: 'M. Sosa', eta: 'Hoy 18:10', prog: 38 },
  { id: 'LG-2026', o: 'Salto', d: 'Montevideo', tipo: 'Granel · 27 t', est: 'Programado', pill: 'blue', chofer: 'R. Cabrera', eta: 'Mañana 09:00', prog: 8 },
  { id: 'LG-2019', o: 'Montevideo', d: 'Rivera', tipo: 'Pallets · 13 t', est: 'Entregado', pill: 'navy', chofer: 'F. Núñez', eta: 'Entregado 10:25', prog: 100 },
];

const PINS = [
  { x: 520, y: 380, l: 'Montevideo', hub: true },
  { x: 215, y: 120, l: 'Salto' },
  { x: 150, y: 230, l: 'Paysandú' },
  { x: 330, y: 330, l: 'Mercedes' },
  { x: 420, y: 175, l: 'Tacuarembó' },
  { x: 560, y: 80, l: 'Rivera' },
  { x: 790, y: 400, l: 'Maldonado' },
  { x: 660, y: 185, l: 'Melo' },
];
const ROUTES = [
  { id: 'r1', d: 'M520 380 C 430 320 300 200 215 120' },
  { id: 'r2', d: 'M520 380 C 630 392 720 398 790 400' },
  { id: 'r3', d: 'M330 330 C 350 270 400 220 420 175' },
  { id: 'r4', d: 'M520 380 C 535 260 552 150 560 80' },
  { id: 'r5', d: 'M520 380 C 600 320 645 250 660 185' },
];
const TRUCKS = [
  { path: 'r1', dur: 17, code: 'SBA 1042' },
  { path: 'r2', dur: 9, code: 'STC 8821' },
  { path: 'r4', dur: 20, code: 'SAB 4417' },
  { path: 'r5', dur: 14, code: 'SEF 1276' },
];

/* ── sparkline ──────────────────────────────────────────── */
function Spark({ data }: { data: number[] }) {
  const w = 96, h = 42;
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - 6 - ((v - min) / (max - min || 1)) * (h - 14),
  ]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const gid = `sg${data.join('')}`;
  return (
    <svg className="ops-kpi__spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity=".22" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── live map svg ───────────────────────────────────────── */
function LiveMap() {
  return (
    <svg
      className="ops-map--hero"
      viewBox="0 0 900 480"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Mapa de operaciones en tiempo real"
    >
      <defs>
        {ROUTES.map((r) => (
          <path key={r.id} id={r.id} d={r.d} />
        ))}
      </defs>
      {/* grid */}
      <g className="map-grid">
        {[60, 120, 180, 240, 300, 360, 420].map((y) => (
          <line key={y} x1="0" y1={y} x2="900" y2={y} />
        ))}
        {[75, 150, 225, 300, 375, 450, 525, 600, 675, 750, 825].map((x) => (
          <line key={x} x1={x} y1="0" x2={x} y2="480" />
        ))}
      </g>
      {/* landmass */}
      <path className="map-land" d="M120 110 C 180 60 320 60 380 120 C 470 80 560 70 620 120 C 700 150 760 220 780 300 C 800 370 760 430 660 440 C 520 455 380 445 260 420 C 150 398 90 330 100 250 C 105 195 95 150 120 110 Z" />
      {/* routes */}
      {ROUTES.map((r) => (
        <path key={r.id} className="route-line" d={r.d} />
      ))}
      {ROUTES.map((r) => (
        <path key={r.id + 'f'} className="route-flow" d={r.d} />
      ))}
      {/* pins */}
      {PINS.map((p) => (
        <g key={p.l}>
          {p.hub && (
            <circle className="pin-ring" cx={p.x} cy={p.y} r="6">
              <animate attributeName="r" values="6;22" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values=".5;0" dur="2.4s" repeatCount="indefinite" />
            </circle>
          )}
          <circle className={p.hub ? 'pin-core--hub' : 'pin-core'} cx={p.x} cy={p.y} r={p.hub ? 6.5 : 4.5} />
          <circle cx={p.x} cy={p.y} r={p.hub ? 2.6 : 1.8} fill="#fff" />
          <text
            className="pin-label"
            x={p.x + (p.x > 820 ? -10 : 11)}
            y={p.y + 4}
            textAnchor={p.x > 820 ? 'end' : 'start'}
          >
            {p.l}
          </text>
        </g>
      ))}
      {/* trucks */}
      {TRUCKS.map((t, i) => (
        <g key={i}>
          <g>
            <animateMotion dur={`${t.dur}s`} repeatCount="indefinite" rotate="auto">
              <mpath href={`#${t.path}`} />
            </animateMotion>
            <ellipse className="truck-glow" cx="0" cy="0" rx="14" ry="9" />
            <rect className="truck-body" x="-11" y="-6" width="15" height="12" rx="2.6" />
            <rect className="truck-cab" x="3.5" y="-5" width="7" height="10" rx="2" />
          </g>
          <g>
            <animateMotion dur={`${t.dur}s`} repeatCount="indefinite" rotate="0">
              <mpath href={`#${t.path}`} />
            </animateMotion>
            <g transform="translate(0,-18)">
              <rect className="truck-tag" x="-22" y="-9" width="44" height="15" rx="4" />
              <text className="truck-tag-tx" x="0" y="1.5" textAnchor="middle">{t.code}</text>
            </g>
          </g>
        </g>
      ))}
    </svg>
  );
}

/* ── sidebar nav ────────────────────────────────────────── */
const NAV = [
  { k: 'ops', href: '/operaciones', label: 'Operaciones', icon: 'dash' as const, active: true },
  { k: 'map', href: '/tracking', label: 'Mapa en vivo', icon: 'map' as const },
  { k: 'trips', href: '/viajes', label: 'Viajes', icon: 'route' as const, badge: '24' },
  { k: 'fleet', href: '/flota', label: 'Flota', icon: 'truck' as const },
  { k: 'turnos', href: '/turnos', label: 'Turnos', icon: 'cal' as const },
  { k: 'cargas', href: '/cargas', label: 'Cargas', icon: 'box' as const, badge: '42' },
  { k: 'bill', href: '/facturacion', label: 'Facturación', icon: 'bill' as const },
];

/* ── ticker items ───────────────────────────────────────── */
const TICKER_ITEMS = [
  { code: 'LG-2029', verb: 'retiró carga en', place: 'Montevideo' },
  { code: 'SBA 1042', verb: 'ingresó a', place: 'Ruta 1 · km 210' },
  { code: 'LG-2019', verb: 'entregado a tiempo en', place: 'Rivera' },
  { code: 'LG-2041', verb: 'nueva oferta', place: '$ 37.000' },
  { code: 'STC 8821', verb: 'en frío estable', place: '4 °C' },
];

/* ── main component ─────────────────────────────────────── */
export default function OperacionesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [alertTab, setAlertTab] = useState<'activas' | 'resueltas'>('activas');
  const [mapSeg, setMapSeg] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setLoaded(true), 1150);
    return () => clearTimeout(id);
  }, []);

  // close sidebar on route change equivalent
  useEffect(() => {
    setSidebarOpen(false);
  }, []);

  const today = new Date();
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const dateStr = `${days[today.getDay()].charAt(0).toUpperCase() + days[today.getDay()].slice(1)} ${today.getDate()} de ${months[today.getMonth()]}`;

  return (
    <div className="ops-root">
      {/* overlay */}
      <div
        className={`ops-overlay${sidebarOpen ? ' ops-overlay--show' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />

      <div className="ops-app">
        {/* ── sidebar ── */}
        <aside className={`ops-side${sidebarOpen ? ' ops-side--open' : ''}`} aria-label="Navegación principal">
          <div className="ops-side__brand">
            <span className="brand-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="12" height="9" rx="1.5" />
                <path d="M14 10h4l3 3v3h-7" />
                <circle cx="7" cy="18" r="1.7" />
                <circle cx="17" cy="18" r="1.7" />
              </svg>
            </span>
            <span className="brand-name">Logiguay</span>
          </div>
          <div className="ops-side__label">Centro de operaciones</div>
          <nav className="ops-nav" aria-label="Principal">
            {NAV.map((n) => (
              <Link
                key={n.k}
                href={n.href}
                className={`ops-nav__item${n.active ? ' ops-nav__item--active' : ''}`}
                aria-current={n.active ? 'page' : undefined}
              >
                <Ic n={n.icon} s={19} />
                {n.label}
                {n.badge && <span className="ops-nav__badge">{n.badge}</span>}
              </Link>
            ))}
          </nav>
          <div className="ops-side__foot">
            <div className="ops-side__user">
              <span className="ops-avatar">TR</span>
              <div style={{ minWidth: 0 }}>
                <div className="ops-side__nm">Transportes Rivera</div>
                <div className="ops-side__sb">Cuenta verificada</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── main ── */}
        <div className="ops-main">
          {/* topbar */}
          <header className="ops-top">
            <button className="ops-top__menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú">
              <Ic n="menu" s={22} />
            </button>
            <div className="ops-search">
              <Ic n="search" s={16} />
              <input placeholder="Buscar viaje, camión, carga o chofer…" aria-label="Buscar" />
              <kbd>⌘K</kbd>
            </div>
            <div className="ops-top__right">
              <button className="ops-icon-btn" aria-label="Notificaciones">
                <Ic n="bell" s={18} />
                <span className="dot" />
              </button>
              <button className="ops-btn ops-btn--primary">
                <Ic n="plus" s={16} />
                Publicar carga
              </button>
            </div>
          </header>

          {/* ticker */}
          <div className="ops-ticker" role="marquee" aria-label="Eventos en vivo">
            <span className="ops-ticker__live">
              <span className="ops-ticker__dot" />
              En vivo
            </span>
            <div className="ops-ticker__track" aria-hidden>
              {[0, 1].map((rep) => (
                <div className="ops-ticker__row" key={rep}>
                  {TICKER_ITEMS.map((it, i) => (
                    <span className="ops-ticker__item" key={i}>
                      <span className="code">{it.code}</span> {it.verb} <b>{it.place}</b>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* content */}
          <main className="ops-content">
            <div className="ops-content__inner">
              {!loaded ? (
                /* skeleton */
                <>
                  <div className="skel" style={{ height: 26, width: 280 }} />
                  <div className="skel" style={{ height: 16, width: 200, marginTop: 10, marginBottom: 22 }} />
                  <div className="ops-kpi-grid" style={{ marginBottom: 18 }}>
                    {[0, 1, 2, 3].map((i) => <div key={i} className="skel skel-kpi" />)}
                  </div>
                  <div className="skel skel-map" style={{ marginBottom: 18 }} />
                  <div className="ops-grid">
                    {[0, 1, 2].map((i) => <div key={i} className="skel skel-side" />)}
                  </div>
                </>
              ) : (
                <>
                  {/* page head */}
                  <div className="ops-page-head ops-reveal" style={{ animationDelay: '0ms' }}>
                    <div>
                      <h1>Centro de operaciones</h1>
                      <p>{dateStr} · 18 camiones en ruta · todo bajo control</p>
                    </div>
                    <div className="ops-head-actions">
                      <button className="ops-btn ops-btn--ghost">
                        <Ic n="grid" s={16} />
                        Vista
                      </button>
                      <button className="ops-btn ops-btn--primary">
                        <Ic n="plus" s={16} />
                        Nuevo viaje
                      </button>
                    </div>
                  </div>

                  {/* KPI strip */}
                  <div className="ops-kpi-grid">
                    {KPIS.map((k, i) => (
                      <div
                        key={k.label}
                        className="ops-kpi ops-reveal"
                        style={{ animationDelay: `${i * 60}ms` }}
                      >
                        <div className="ops-kpi__top">
                          <span className="ops-kpi__label">{k.label}</span>
                          <span className="ops-kpi__ic"><Ic n={k.icon} s={17} /></span>
                        </div>
                        <div className="ops-kpi__num">
                          {k.num}
                          {k.u && <span className="u">{k.u}</span>}
                        </div>
                        <div className="ops-kpi__foot">
                          <span className={`trend trend--${k.up ? 'up' : 'down'}`}>
                            <Ic n={k.up ? 'up' : 'down'} s={12} />
                            {k.trend}
                          </span>
                          <span className="ops-kpi__sub">{k.sub}</span>
                        </div>
                        <Spark data={k.spark} />
                      </div>
                    ))}
                  </div>

                  {/* map hero */}
                  <div className="ops-panel ops-reveal" style={{ animationDelay: '120ms', marginBottom: 18 }}>
                    <div className="ops-panel__head">
                      <span className="ops-panel__title">
                        <span className="live-dot" />
                        Mapa de operaciones
                      </span>
                      <div className="ops-seg" role="group" aria-label="Capa del mapa">
                        {['Camiones', 'Rutas', 'Turnos'].map((label, i) => (
                          <button
                            key={label}
                            aria-pressed={mapSeg === i ? 'true' : 'false'}
                            onClick={() => setMapSeg(i)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="ops-map-wrap">
                      <LiveMap />
                      {/* legend */}
                      <div className="ops-glass ops-glass--legend">
                        <div className="lg-row">
                          <span className="sw" style={{ background: 'var(--accent)' }} />
                          <b style={{ fontWeight: 600 }}>18</b>&nbsp;camiones en ruta
                        </div>
                        <div className="lg-row">
                          <span className="sw" style={{ background: 'var(--green)' }} />
                          14 a tiempo
                        </div>
                        <div className="lg-row">
                          <span className="sw" style={{ background: 'var(--orange)' }} />
                          2 con demora
                        </div>
                      </div>
                      {/* dock */}
                      <div className="ops-glass ops-glass--dock">
                        <div className="dock__head">
                          <span className="t">
                            <Ic n="route" s={15} style={{ color: 'var(--accent)' }} />
                            Camiones en ruta
                          </span>
                          <span className="c">18 activos</span>
                        </div>
                        <div className="dock__list">
                          {DOCK.map((t) => (
                            <div className="dock-trip" key={t.code}>
                              <span className="dock-trip__ic"><Ic n="truck" s={16} /></span>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div className="code">{t.code}</div>
                                <div className="rt">{t.rt}</div>
                                <div className="dock-trip__mini">
                                  <i style={{ width: `${t.prog}%` }} />
                                </div>
                              </div>
                              <div className="pr">
                                <div className="eta">{t.eta}</div>
                                <div className={`st ${t.warn ? 'st--warn' : 'st--ok'}`}>{t.st}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* summary */}
                      <div className="ops-glass ops-glass--sum">
                        <div>
                          <div className="s-n">358 km</div>
                          <div className="s-l">distancia media</div>
                        </div>
                        <div>
                          <div className="s-n">2 h 10</div>
                          <div className="s-l">ETA promedio</div>
                        </div>
                        <div>
                          <div className="s-n">19</div>
                          <div className="s-l">departamentos</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ops grid */}
                  <div className="ops-grid">
                    {/* turnos */}
                    <div className="ops-panel ops-reveal" style={{ animationDelay: '160ms' }}>
                      <div className="ops-panel__head">
                        <span className="ops-panel__title">
                          <Ic n="cal" s={16} style={{ color: 'var(--accent)' }} />
                          Turnos de hoy
                        </span>
                        <span className="ops-panel__meta">4 prog.</span>
                      </div>
                      <div className="ops-panel__body">
                        {TURNOS.map((t) => (
                          <div className="ops-slot" key={t.h}>
                            <div className="ops-slot__time">
                              {t.h}<span>hs</span>
                            </div>
                            <div className="ops-slot__main">
                              <div className="t">{t.m}</div>
                              <div className="s">{t.s}</div>
                            </div>
                            <span className={`ops-pill ops-pill--tag-${t.tag}`} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* cargas disponibles */}
                    <div className="ops-panel ops-reveal" style={{ animationDelay: '210ms' }}>
                      <div className="ops-panel__head">
                        <span className="ops-panel__title">
                          <Ic n="box" s={16} style={{ color: 'var(--accent)' }} />
                          Cargas disponibles
                        </span>
                        <span className="ops-panel__meta">42 nuevas</span>
                      </div>
                      <div className="ops-panel__body">
                        {CARGAS.map((c, i) => (
                          <div className="ops-load" key={i}>
                            <div>
                              <div className="r">
                                {c.o}
                                <Ic n="arrow" s={13} style={{ color: 'var(--accent)' }} />
                                {c.d}
                              </div>
                              <div className="m">{c.t}</div>
                            </div>
                            <div className="ops-load__pay">
                              <div className="p">{c.pay}</div>
                              <div className="o">{c.of}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* alertas */}
                    <div className="ops-panel ops-reveal" style={{ animationDelay: '260ms' }}>
                      <div className="ops-panel__head">
                        <span className="ops-panel__title">
                          <Ic n="bell" s={16} style={{ color: 'var(--orange)' }} />
                          Alertas
                        </span>
                        <div className="ops-seg" role="group" aria-label="Filtro de alertas">
                          {(['activas', 'resueltas'] as const).map((tab) => (
                            <button
                              key={tab}
                              aria-pressed={alertTab === tab ? 'true' : 'false'}
                              onClick={() => setAlertTab(tab)}
                            >
                              {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="ops-panel__body">
                        {alertTab === 'activas' ? (
                          ALERTS.map((a, i) => (
                            <div className={`ops-alert ops-alert--${a.k}`} key={i}>
                              <span className="ops-alert__ic"><Ic n={a.ic} s={16} /></span>
                              <div className="ops-alert__main">
                                <div className="t">{a.t}</div>
                                <div className="s">{a.s}</div>
                              </div>
                              <span className="ops-alert__when">{a.when}</span>
                            </div>
                          ))
                        ) : (
                          <div className="ops-empty">
                            <span className="ops-empty__art"><Ic n="check" s={30} /></span>
                            <h4>Todo al día</h4>
                            <p>No quedan alertas sin resolver. Te avisamos apenas surja algo en la operación.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* trips table */}
                  <div className="ops-panel ops-reveal" style={{ animationDelay: '300ms' }}>
                    <div className="ops-panel__head">
                      <span className="ops-panel__title">
                        <span className="live-dot" />
                        Viajes activos
                      </span>
                      <button className="ops-btn ops-btn--ghost ops-btn--sm">
                        <Ic n="filter" s={14} />
                        Filtrar
                      </button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <div style={{ minWidth: 700 }}>
                        <div className="ops-tbl">
                          <div className="tbl-head">
                            <span>Viaje</span>
                            <span>Ruta</span>
                            <span className="col-tipo">Carga</span>
                            <span>Estado</span>
                            <span className="col-chofer">Chofer</span>
                            <span className="col-prog">ETA · Progreso</span>
                            <span />
                          </div>
                          {TRIPS.map((t) => (
                            <div className="tbl-row" key={t.id}>
                              <span className="code">{t.id}</span>
                              <span className="route-cell">
                                <span style={{ whiteSpace: 'nowrap' }}>{t.o}</span>
                                <Ic n="arrow" s={14} />
                                <span style={{ whiteSpace: 'nowrap' }}>{t.d}</span>
                              </span>
                              <span className="muted col-tipo">{t.tipo}</span>
                              <span>
                                <span className={`ops-pill ops-pill--${t.pill}`}>
                                  <span className="d" />
                                  {t.est}
                                </span>
                              </span>
                              <span className="muted col-chofer">{t.chofer}</span>
                              <span className="ops-prog col-prog">
                                <div className="eta">{t.eta}</div>
                                <div className="ops-prog__bar">
                                  <i style={{ width: `${t.prog}%` }} />
                                </div>
                                <div className="ops-prog__n">{t.prog}%</div>
                              </span>
                              <span style={{ textAlign: 'right' }}>
                                <button className="ops-btn ops-btn--ghost ops-btn--sm">Ver</button>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* bottom tabbar (mobile only) */}
      <nav className="ops-tabbar" aria-label="Navegación móvil">
        <div className="ops-tabbar__inner">
          {[
            { icon: 'dash' as const, label: 'Inicio', active: true },
            { icon: 'map' as const, label: 'Mapa' },
            { icon: 'route' as const, label: 'Viajes' },
            { icon: 'box' as const, label: 'Cargas' },
            { icon: 'bell' as const, label: 'Alertas' },
          ].map((item, i) => (
            <button key={item.label} aria-current={item.active ? 'true' : undefined}>
              <Ic n={item.icon} s={22} />
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
