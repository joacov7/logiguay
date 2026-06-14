'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface Step {
  emoji: string;
  title: string;
  description: string;
  buttonLabel: string;
  href?: string;
}

const DADOR_STEPS: Step[] = [
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
];

const TRANSPORTISTA_STEPS: Step[] = [
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
];

const CHOFER_STEPS: Step[] = [
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
];

const STORAGE_KEY = 'logiguay_onboarded';

export function OnboardingModal() {
  const { user } = useAuth();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const alreadyOnboarded = localStorage.getItem(STORAGE_KEY);
      if (!alreadyOnboarded) {
        setVisible(true);
      }
    }
  }, []);

  if (!visible || !user) return null;

  const role = (user as { role?: string }).role;

  let steps: Step[];
  if (role === 'TRANSPORTISTA') {
    steps = TRANSPORTISTA_STEPS;
  } else if (role === 'CHOFER') {
    steps = CHOFER_STEPS;
  } else {
    steps = DADOR_STEPS;
  }

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;

  function handleAction() {
    if (isLast) {
      closeModal();
    } else if (currentStep.href && step === 0) {
      closeModal();
      router.push(currentStep.href);
    } else {
      setStep((s) => s + 1);
    }
  }

  function closeModal() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          aria-label="Cerrar"
        >
          ×
        </button>

        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === step ? 'bg-[#15A66A]' : i < step ? 'bg-[#7dd4aa]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mb-6 font-medium">
          Paso {step + 1} de {steps.length}
        </p>

        <div className="text-center text-6xl mb-5">{currentStep.emoji}</div>

        <h2 className="text-center text-xl font-bold text-gray-900 mb-3">
          {currentStep.title}
        </h2>

        <p className="text-center text-gray-500 text-sm leading-relaxed mb-8">
          {currentStep.description}
        </p>

        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Atrás
            </button>
          )}
          <button
            onClick={handleAction}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: '#15A66A' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#12905d')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#15A66A')}
          >
            {currentStep.buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
