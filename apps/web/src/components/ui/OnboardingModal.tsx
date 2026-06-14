'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/hooks/useAuth';
import type { Role } from '@/types';

const STORAGE_KEY = 'logiguay_onboarded';

interface Step {
  emoji: string;
  title: string;
  description: string;
  buttonLabel: string;
  href?: string;
}

const STEPS: Record<string, Step[]> = {
  DADOR: [
    {
      emoji: '📦',
      title: 'Publicá tu primera carga',
      description: 'Completá origen, destino y tipo de mercadería. Tarda 2 minutos.',
      buttonLabel: 'Ir a publicar carga',
      href: '/cargas/nueva',
    },
    {
      emoji: '💬',
      title: 'Recibís cotizaciones',
      description: 'Los transportistas te mandan su precio. Vos elegís el mejor.',
      buttonLabel: 'Siguiente',
    },
    {
      emoji: '🚛',
      title: 'Seguí el viaje en tiempo real',
      description: 'Una vez que aceptás, podés ver dónde está tu carga en todo momento.',
      buttonLabel: '¡Empezar!',
    },
  ],
  TRANSPORTISTA: [
    {
      emoji: '🚛',
      title: 'Cargá tu flota',
      description: 'Agregá tus vehículos y choferes para poder operar.',
      buttonLabel: 'Ir a flota',
      href: '/flota',
    },
    {
      emoji: '📋',
      title: 'Buscá cargas en la bolsa',
      description: 'Filtrá por provincia, peso y fecha. Cotizá las que te convengan.',
      buttonLabel: 'Siguiente',
    },
    {
      emoji: '💰',
      title: 'Gestioná tus viajes y cobranzas',
      description: 'Una vez aceptada tu cotización, el viaje aparece en tu panel.',
      buttonLabel: '¡Empezar!',
    },
  ],
  CHOFER: [
    {
      emoji: '👋',
      title: 'Bienvenido, chofer',
      description: 'Esta app te permite actualizar el estado de tu viaje desde el celular.',
      buttonLabel: 'Siguiente',
    },
    {
      emoji: '🗺️',
      title: 'Marcá cada etapa del viaje',
      description: 'Tocá el botón grande cuando salís, cuando llegás, cuando cargás y cuando descargás.',
      buttonLabel: 'Siguiente',
    },
    {
      emoji: '✅',
      title: 'Simple y rápido',
      description: 'Nada más que eso. Tu empresa ve todo en tiempo real.',
      buttonLabel: '¡Entendido!',
    },
  ],
};

export function OnboardingModal() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!loading && user) {
      const alreadyOnboarded = localStorage.getItem(STORAGE_KEY);
      if (!alreadyOnboarded) {
        setVisible(true);
      }
    }
  }, [loading, user]);

  if (!visible || !user) return null;

  const role: Role = user.role;
  const steps = STEPS[role] ?? STEPS['DADOR'];
  const current = steps[step];
  const isLastStep = step === steps.length - 1;

  function close() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  function handleAction() {
    if (isLastStep) {
      close();
      return;
    }
    if (current.href && step === 0) {
      close();
      router.push(current.href as Parameters<typeof router.push>[0]);
      return;
    }
    setStep((s) => s + 1);
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <button
          onClick={close}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
          aria-label="Cerrar"
        >
          ×
        </button>

        <div className="flex items-center justify-center gap-2 mb-4">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-6 h-2.5 bg-[#15A66A]'
                  : i < step
                  ? 'w-2.5 h-2.5 bg-[#15A66A] opacity-50'
                  : 'w-2.5 h-2.5 bg-gray-200'
              }`}
            />
          ))}
        </div>

        <p className="text-xs text-gray-400 text-center mb-6">
          Paso {step + 1} de {steps.length}
        </p>

        <div className="text-center">
          <div className="text-6xl mb-4">{current.emoji}</div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">{current.title}</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">{current.description}</p>
        </div>

        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={handleBack}
              className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Atrás
            </button>
          )}
          <button
            onClick={handleAction}
            className="flex-1 py-2.5 px-4 rounded-xl text-white text-sm font-semibold transition-colors"
            style={{ background: '#15A66A' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#12905d')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#15A66A')}
          >
            {current.buttonLabel}
          </button>
        </div>

        <button
          onClick={close}
          className="block w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-4 transition-colors"
        >
          Omitir introducción
        </button>
      </div>
    </div>
  );
}
