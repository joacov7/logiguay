'use client';

import React, { useState, useEffect } from 'react';
import { Settings, ShieldAlert, CheckCircle, Navigation } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface GeneralSettings {
  platformName: string;
  defaultCurrency: 'ARS' | 'USD' | 'UYU';
  defaultLanguage: 'es' | 'en' | 'pt';
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        enabled ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function AdminConfiguracionPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [general, setGeneral] = useState<GeneralSettings>({
    platformName: 'LOGIGUAY',
    defaultCurrency: 'ARS',
    defaultLanguage: 'es',
  });
  const [generalSaved, setGeneralSaved] = useState(false);

  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ['app-settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
  });

  const saveSetting = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      api.put(`/admin/settings/${key}`, { value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app-settings'] }),
  });

  const navEnabled = settings['feature_navigation_button'] !== 'false';

  if (user && user.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-gray-800">Acceso denegado</h2>
        <p className="text-gray-500">No tenés permisos para acceder a esta sección.</p>
      </div>
    );
  }

  const handleSaveGeneral = async () => {
    setGeneralSaved(false);
    await new Promise((r) => setTimeout(r, 400));
    setGeneralSaved(true);
    setTimeout(() => setGeneralSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-blue-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-sm text-gray-500">Parámetros generales del sistema</p>
        </div>
      </div>

      {/* Funcionalidades (feature flags reales) */}
      <Card>
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Funcionalidades</h2>
            <p className="text-xs text-gray-400 mt-0.5">Activá o desactivá funciones para todos los usuarios</p>
          </div>

          <div className="divide-y divide-gray-100">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-start gap-3">
                <Navigation className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Botón "Abrir ruta"</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Permite al chofer abrir Google Maps / Waze con la ruta del viaje desde la app mobile.
                    Desactivalo si necesitás controlar las rutas disponibles.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-4 shrink-0">
                {saveSetting.isPending && (
                  <span className="text-xs text-gray-400">Guardando…</span>
                )}
                {saveSetting.isSuccess && !saveSetting.isPending && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckCircle className="h-3.5 w-3.5" /> Guardado
                  </span>
                )}
                <Toggle
                  enabled={navEnabled}
                  onChange={(v) =>
                    saveSetting.mutate({ key: 'feature_navigation_button', value: String(v) })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* General */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">General</h2>
            <div className="flex items-center gap-3">
              {generalSaved && (
                <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                  <CheckCircle className="h-4 w-4" /> Guardado
                </span>
              )}
              <Button variant="primary" size="sm" onClick={handleSaveGeneral}>
                Guardar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Nombre de la plataforma</label>
              <input
                type="text"
                value={general.platformName}
                onChange={(e) => setGeneral({ ...general, platformName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Moneda por defecto</label>
              <select
                value={general.defaultCurrency}
                onChange={(e) => setGeneral({ ...general, defaultCurrency: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ARS">ARS — Peso argentino</option>
                <option value="USD">USD — Dólar estadounidense</option>
                <option value="UYU">UYU — Peso uruguayo</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Idioma por defecto</label>
              <select
                value={general.defaultLanguage}
                onChange={(e) => setGeneral({ ...general, defaultLanguage: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="pt">Português</option>
              </select>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
