'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { Send, ShieldAlert, Info, X } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface Message {
  id: string;
  body: string;
  senderCompanyId: string;
  maskedContact: boolean;
  createdAt: string;
  senderCompany?: { id: string; name: string };
}

interface Props {
  tripId: string;
  onClose: () => void;
}

export function TripChat({ tripId, onClose }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const companyId = (user as any)?.companyId ?? null;
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const { data: messages = [], isLoading, isError, refetch } = useQuery<Message[]>({
    queryKey: ['chat', tripId],
    queryFn: async () => (await api.get(`/messages/trip/${tripId}`)).data ?? [],
  });

  // Realtime
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(`${API_URL}/tracking`, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('subscribe-trip', tripId));
    socket.on('message', (msg: Message) => {
      qc.setQueryData<Message[]>(['chat', tripId], (prev = []) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
    });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [tripId, qc]);

  const sendMutation = useMutation({
    mutationFn: async (body: string) => (await api.post(`/messages/trip/${tripId}`, { body })).data,
    onSuccess: (msg: Message) => {
      qc.setQueryData<Message[]>(['chat', tripId], (prev = []) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
      setText('');
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sendMutation.isPending) return;
    sendMutation.mutate(body);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex h-[600px] max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-base font-bold text-gray-900">Mensajes</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Aviso anti-fraude */}
        <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2">
          <ShieldAlert className="h-4 w-4 shrink-0 text-yellow-700" />
          <p className="text-xs leading-tight text-yellow-800">
            Coordiná dentro de LOGIGUAY. Los datos de contacto se ocultan automáticamente.
          </p>
        </div>

        {/* Mensajes */}
        <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50 p-4">
          {isLoading ? (
            <p className="mt-8 text-center text-sm text-gray-400">Cargando…</p>
          ) : isError ? (
            <div className="mt-12 text-center">
              <p className="text-sm font-semibold text-red-600">No se pudieron cargar los mensajes</p>
              <button onClick={() => refetch()} className="mt-2 text-xs text-blue-700 underline">
                Reintentar
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="mt-12 text-center">
              <p className="mb-2 text-3xl">💬</p>
              <p className="text-sm font-semibold text-gray-600">Sin mensajes aún</p>
              <p className="mt-1 px-6 text-xs text-gray-400">
                Escribí para coordinar la carga, horarios o detalles del viaje.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.senderCompanyId === companyId;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                      mine
                        ? 'rounded-br-sm bg-blue-900 text-white'
                        : 'rounded-bl-sm border border-gray-200 bg-white text-gray-900'
                    }`}
                  >
                    {!mine && m.senderCompany?.name && (
                      <p className="mb-0.5 text-xs font-bold text-blue-900">{m.senderCompany.name}</p>
                    )}
                    <p className="text-sm leading-snug">{m.body}</p>
                    {m.maskedContact && (
                      <span className={`mt-1 flex items-center gap-1 text-[10px] italic ${mine ? 'text-blue-200' : 'text-gray-400'}`}>
                        <Info className="h-2.5 w-2.5" /> Contacto oculto
                      </span>
                    )}
                    <p className={`mt-1 text-right text-[10px] ${mine ? 'text-blue-200' : 'text-gray-400'}`}>
                      {format(new Date(m.createdAt), 'HH:mm')}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {sendMutation.isError && (
          <p className="border-t border-red-100 bg-red-50 px-4 py-1.5 text-xs text-red-600">
            {(sendMutation.error as any)?.response?.data?.message || 'No se pudo enviar el mensaje. Intentá de nuevo.'}
          </p>
        )}
        <form onSubmit={send} className="flex items-end gap-2 border-t border-gray-200 p-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) send(e); }}
            placeholder="Escribí un mensaje…"
            rows={1}
            maxLength={2000}
            className="max-h-28 flex-1 resize-none rounded-xl bg-gray-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30"
          />
          <button
            type="submit"
            disabled={!text.trim() || sendMutation.isPending}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-900 text-white disabled:bg-gray-300"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
