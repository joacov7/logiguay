'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Truck, Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      // Always show success to prevent email enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
            {sent ? <CheckCircle className="h-6 w-6 text-white" /> : <Mail className="h-6 w-6 text-white" />}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {sent ? '¡Revisá tu email!' : 'Recuperar contraseña'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {sent
              ? `Si existe una cuenta con ${email}, vas a recibir un link para restablecer tu contraseña.`
              : 'Ingresá tu email y te mandamos un link para crear una nueva contraseña.'
            }
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
            />
            <Button type="submit" className="w-full" loading={loading} size="lg">
              Enviar link de recuperación
            </Button>
          </form>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center text-sm text-green-700">
            El email puede tardar unos minutos en llegar. Revisá también la carpeta de spam.
          </div>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/login" className="text-blue-600 font-medium hover:underline">
            ← Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
