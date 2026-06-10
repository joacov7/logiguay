'use client';

import React, { useState } from 'react';
import { DollarSign, ShieldAlert, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

interface ComisionSettings {
  porcentajePorViaje: number;
  tipoPorDefecto: 'PORCENTAJE' | 'FIJO';
  montoFijoPorDefecto: number;
  aplicarAutomaticamente: boolean;
}

export default function AdminComisionesPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ComisionSettings>({
    porcentajePorViaje: 5,
    tipoPorDefecto: 'PORCENTAJE',
    montoFijoPorDefecto: 500,
    aplicarAutomaticamente: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (user && user.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-gray-800">Acceso denegado</h2>
        <p className="text-gray-500">No tenés permisos para acceder a esta sección.</p>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="h-6 w-6 text-blue-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comisiones</h1>
          <p className="text-sm text-gray-500">Configurar comisiones aplicadas por viaje</p>
        </div>
      </div>

      <Card>
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-4">Configuración de comisiones</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Comisión por viaje finalizado (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={settings.porcentajePorViaje}
                  onChange={(e) =>
                    setSettings({ ...settings, porcentajePorViaje: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Tipo por defecto
                </label>
                <select
                  value={settings.tipoPorDefecto}
                  onChange={(e) =>
                    setSettings({ ...settings, tipoPorDefecto: e.target.value as 'PORCENTAJE' | 'FIJO' })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PORCENTAJE">PORCENTAJE</option>
                  <option value="FIJO">FIJO</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Monto fijo por defecto (ARS)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={settings.montoFijoPorDefecto}
                  onChange={(e) =>
                    setSettings({ ...settings, montoFijoPorDefecto: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <input
                  id="aplicar-auto"
                  type="checkbox"
                  checked={settings.aplicarAutomaticamente}
                  onChange={(e) =>
                    setSettings({ ...settings, aplicarAutomaticamente: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="aplicar-auto" className="text-sm font-medium text-gray-700">
                  Aplicar comisión automáticamente
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">Los cambios aplican a nuevos viajes solamente.</p>
            <div className="flex items-center gap-3">
              {saved && (
                <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Cambios guardados
                </span>
              )}
              <Button variant="primary" loading={saving} onClick={handleSave}>
                Guardar cambios
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
