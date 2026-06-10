'use client';

import React, { useState } from 'react';
import { Settings, ShieldAlert, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

interface GeneralSettings {
  platformName: string;
  defaultCurrency: 'ARS' | 'USD' | 'UYU';
  defaultLanguage: 'es' | 'en' | 'pt';
}

interface NotificationSettings {
  emailAlerts: boolean;
  pushAlerts: boolean;
}

interface MaintenanceSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

type SavedSection = 'general' | 'notificaciones' | 'mantenimiento' | null;

export default function AdminConfiguracionPage() {
  const { user } = useAuth();

  const [general, setGeneral] = useState<GeneralSettings>({
    platformName: 'LOGIGUAY',
    defaultCurrency: 'ARS',
    defaultLanguage: 'es',
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailAlerts: true,
    pushAlerts: false,
  });

  const [maintenance, setMaintenance] = useState<MaintenanceSettings>({
    maintenanceMode: false,
    maintenanceMessage: 'El sistema se encuentra en mantenimiento. Volvemos pronto.',
  });

  const [savingSection, setSavingSection] = useState<SavedSection>(null);
  const [savedSection, setSavedSection] = useState<SavedSection>(null);

  if (user && user.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-gray-800">Acceso denegado</h2>
        <p className="text-gray-500">No tenés permisos para acceder a esta sección.</p>
      </div>
    );
  }

  const handleSave = async (section: NonNullable<SavedSection>) => {
    setSavingSection(section);
    setSavedSection(null);
    await new Promise((r) => setTimeout(r, 600));
    setSavingSection(null);
    setSavedSection(section);
    setTimeout(() => setSavedSection(null), 3000);
  };

  const SaveFeedback = ({ section }: { section: NonNullable<SavedSection> }) => (
    <div className="flex items-center gap-3">
      {savedSection === section && (
        <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
          <CheckCircle className="h-4 w-4" />
          Guardado
        </span>
      )}
      <Button
        variant="primary"
        size="sm"
        loading={savingSection === section}
        onClick={() => handleSave(section)}
      >
        Guardar
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-blue-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-sm text-gray-500">Parámetros generales del sistema</p>
        </div>
      </div>

      {/* General */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">General</h2>
            <SaveFeedback section="general" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Nombre de la plataforma
              </label>
              <input
                type="text"
                value={general.platformName}
                onChange={(e) => setGeneral({ ...general, platformName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Moneda por defecto
              </label>
              <select
                value={general.defaultCurrency}
                onChange={(e) =>
                  setGeneral({ ...general, defaultCurrency: e.target.value as GeneralSettings['defaultCurrency'] })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ARS">ARS — Peso argentino</option>
                <option value="USD">USD — Dólar estadounidense</option>
                <option value="UYU">UYU — Peso uruguayo</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Idioma por defecto
              </label>
              <select
                value={general.defaultLanguage}
                onChange={(e) =>
                  setGeneral({ ...general, defaultLanguage: e.target.value as GeneralSettings['defaultLanguage'] })
                }
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

      {/* Notificaciones */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Notificaciones</h2>
            <SaveFeedback section="notificaciones" />
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.emailAlerts}
                onChange={(e) => setNotifications({ ...notifications, emailAlerts: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Alertas por email</span>
                <p className="text-xs text-gray-400">Enviar notificaciones importantes por correo electrónico</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.pushAlerts}
                onChange={(e) => setNotifications({ ...notifications, pushAlerts: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Alertas push</span>
                <p className="text-xs text-gray-400">Enviar notificaciones push al navegador</p>
              </div>
            </label>
          </div>
        </div>
      </Card>

      {/* Mantenimiento */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Mantenimiento</h2>
            <SaveFeedback section="mantenimiento" />
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={maintenance.maintenanceMode}
                onChange={(e) => setMaintenance({ ...maintenance, maintenanceMode: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Modo mantenimiento</span>
                <p className="text-xs text-gray-400">Muestra un banner de mantenimiento a todos los usuarios</p>
              </div>
            </label>

            {maintenance.maintenanceMode && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Mensaje de mantenimiento
                </label>
                <textarea
                  rows={3}
                  value={maintenance.maintenanceMessage}
                  onChange={(e) => setMaintenance({ ...maintenance, maintenanceMessage: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
