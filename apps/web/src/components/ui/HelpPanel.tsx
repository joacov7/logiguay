'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  HelpCircle, X, Truck, Package, ShoppingBag, Navigation,
  Users, MapPin, Bell, CreditCard, Calendar, ArrowLeftRight,
  FileText, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Section {
  icon: React.ElementType;
  title: string;
  steps: { text: string; link?: string; linkLabel?: string }[];
}

const GUIA_TRANSPORTISTA: Section[] = [
  {
    icon: Truck,
    title: 'Antes de empezar: cargá tu flota',
    steps: [
      { text: 'Entrá a Flota y agregá tus camiones (patente, tipo, año).', link: '/flota', linkLabel: 'Ir a Flota' },
      { text: 'Después entrá a Choferes y registrá a tu personal con su licencia.', link: '/choferes', linkLabel: 'Ir a Choferes' },
    ],
  },
  {
    icon: ShoppingBag,
    title: 'Encontrá cargas para transportar',
    steps: [
      { text: 'En la Bolsa de Cargas ves todas las cargas publicadas por empresas que necesitan flete.', link: '/bolsa', linkLabel: 'Ver Bolsa' },
      { text: 'Podés filtrar por tipo de carga, peso, provincia o distancia desde tu ubicación.' },
      { text: 'Hacé clic en una carga y cotizá el precio que querés cobrar.' },
    ],
  },
  {
    icon: Navigation,
    title: 'Gestión de viajes',
    steps: [
      { text: 'Cuando el dador acepta tu cotización, el viaje aparece en Viajes.', link: '/viajes', linkLabel: 'Ver Viajes' },
      { text: 'Asigná un chofer y un camión al viaje.' },
      { text: 'Actualizá el estado a medida que avanza: En camino → En carga → En tránsito → Entregado.' },
    ],
  },
  {
    icon: MapPin,
    title: 'Tracking en tiempo real',
    steps: [
      { text: 'Desde el mapa de Tracking podés ver dónde está cada camión.', link: '/tracking', linkLabel: 'Ver Tracking' },
      { text: 'Los choferes actualizan su posición desde la app.' },
    ],
  },
  {
    icon: ArrowLeftRight,
    title: 'Viajes de retorno',
    steps: [
      { text: 'Si tu camión va a quedar vacío en una ciudad, buscá cargas de retorno.', link: '/retorno', linkLabel: 'Ver Retorno' },
      { text: 'Logiguay te muestra cargas disponibles cerca del punto de descarga.' },
    ],
  },
  {
    icon: Calendar,
    title: 'Turnos de carga',
    steps: [
      { text: 'Algunas empresas usan turnos para organizar las cargas.', link: '/turnos', linkLabel: 'Ver Turnos' },
      { text: 'Reservá un turno para que tu camión llegue en el horario pactado.' },
    ],
  },
  {
    icon: CreditCard,
    title: 'Facturación',
    steps: [
      { text: 'Cuando se finaliza un viaje, se genera automáticamente la factura.', link: '/facturacion', linkLabel: 'Ver Facturación' },
      { text: 'Podés ver el estado de cada factura (pendiente, pagada, cancelada).' },
    ],
  },
];

const GUIA_DADOR: Section[] = [
  {
    icon: Package,
    title: 'Publicar una carga',
    steps: [
      { text: 'Entrá a Cargas y hacé clic en "Nueva carga".', link: '/cargas', linkLabel: 'Ir a Cargas' },
      { text: 'Completá origen, destino, tipo de mercadería, peso y fecha en que la necesitás.' },
      { text: 'Publicála para que las empresas de transporte puedan cotizar.' },
    ],
  },
  {
    icon: ShoppingBag,
    title: 'Recibir cotizaciones',
    steps: [
      { text: 'Las empresas de transporte van a ver tu carga en la Bolsa y te mandan su precio.' },
      { text: 'Entrá a la carga y comparé las cotizaciones recibidas.' },
      { text: 'Cuando encontrés la que más te conviene, hacé clic en "Aceptar cotización".' },
    ],
  },
  {
    icon: Navigation,
    title: 'Seguir el viaje',
    steps: [
      { text: 'Una vez aceptada la cotización, el viaje queda creado en el sistema.', link: '/viajes', linkLabel: 'Ver Viajes' },
      { text: 'Desde Tracking podés ver en el mapa dónde está tu carga en todo momento.', link: '/tracking', linkLabel: 'Ver Tracking' },
    ],
  },
  {
    icon: Truck,
    title: 'Buscar camiones disponibles',
    steps: [
      { text: 'En Camiones podés buscar transportistas cercanos y contactarlos directamente.', link: '/camiones-disponibles', linkLabel: 'Ver Camiones' },
      { text: 'Mandales una solicitud con la ruta y el precio que ofrecés.' },
    ],
  },
  {
    icon: Calendar,
    title: 'Asignar turnos de carga',
    steps: [
      { text: 'Si querés organizar los horarios de llegada, publicá turnos disponibles.', link: '/turnos', linkLabel: 'Ver Turnos' },
      { text: 'Los transportistas reservan el horario que les queda bien.' },
    ],
  },
  {
    icon: Bell,
    title: 'Alertas',
    steps: [
      { text: 'Cuando un transportista contacta o hay novedades de un viaje, te llega una alerta.', link: '/alertas', linkLabel: 'Ver Alertas' },
    ],
  },
];

const GUIA_CHOFER: Section[] = [
  {
    icon: Navigation,
    title: 'Tus viajes asignados',
    steps: [
      { text: 'En Viajes ves los viajes que te asignó tu empresa.', link: '/viajes', linkLabel: 'Ver Viajes' },
      { text: 'Cada viaje tiene la dirección de carga, la de entrega y los datos del cliente.' },
    ],
  },
  {
    icon: MapPin,
    title: 'Actualizar el estado del viaje',
    steps: [
      { text: 'A medida que avanzás, actualizá el estado: salí, llegué al origen, cargué, llegué al destino.' },
      { text: 'Así la empresa y el cliente pueden seguirte en tiempo real.' },
    ],
  },
  {
    icon: FileText,
    title: 'Documentos',
    steps: [
      { text: 'En Documentos podés ver tu licencia de conducir y otros documentos cargados.', link: '/documentos', linkLabel: 'Ver Documentos' },
      { text: 'Si tu licencia está por vencer, te va a aparecer una alerta.' },
    ],
  },
  {
    icon: Bell,
    title: 'Alertas',
    steps: [
      { text: 'Recibís notificaciones cuando te asignan un viaje o hay cambios.', link: '/alertas', linkLabel: 'Ver Alertas' },
    ],
  },
];

function SectionItem({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-50 rounded-lg shrink-0">
            <Icon className="h-4 w-4 text-blue-600" />
          </div>
          <span className="text-sm font-semibold text-gray-800">{section.title}</span>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3 bg-gray-50">
          {section.steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <div className="text-sm text-gray-600 space-y-1">
                <p>{step.text}</p>
                {step.link && (
                  <Link
                    href={step.link}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline"
                  >
                    {step.linkLabel} →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = {
  TRANSPORTISTA: 'Transportista',
  DADOR: 'Dador de carga',
  CHOFER: 'Chofer',
  ADMIN: 'Administrador',
};

const ROLE_INTRO: Record<string, string> = {
  TRANSPORTISTA: 'Acá encontrás cómo usar Logiguay paso a paso para encontrar cargas, gestionar tu flota y hacer seguimiento de tus viajes.',
  DADOR: 'Acá encontrás cómo publicar tus cargas, recibir cotizaciones y hacer seguimiento de tus envíos.',
  CHOFER: 'Acá encontrás cómo ver tus viajes asignados y mantener actualizado el estado de cada entrega.',
  ADMIN: 'Tenés acceso completo al sistema. Desde el panel de Administración podés gestionar empresas, usuarios, suscripciones e ingresos.',
};

export function HelpPanel() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const role = user?.role ?? '';
  const sections =
    role === 'TRANSPORTISTA' ? GUIA_TRANSPORTISTA
    : role === 'DADOR' ? GUIA_DADOR
    : role === 'CHOFER' ? GUIA_CHOFER
    : [];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Ayuda"
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
      >
        <HelpCircle className="h-6 w-6" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-over panel */}
      <div
        className={`fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Guía de uso · {ROLE_LABEL[role] ?? 'Usuario'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Tocá cada sección para ver los pasos</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Intro */}
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
          <p className="text-sm text-blue-800">{ROLE_INTRO[role] ?? ''}</p>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {sections.length > 0 ? (
            sections.map((section) => (
              <SectionItem key={section.title} section={section} />
            ))
          ) : (
            <div className="text-center py-12 text-sm text-gray-400">
              No hay guía disponible para tu rol.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            ¿Necesitás más ayuda? Escribinos a{' '}
            <a href="mailto:soporte@logiguay.com.ar" className="text-blue-600 hover:underline">
              soporte@logiguay.com.ar
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
