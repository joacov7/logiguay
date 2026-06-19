import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, ShieldAlert, Info } from 'lucide-react-native';
import { io, Socket } from 'socket.io-client';
import api, { getApiErrorMessage } from '../../src/lib/api';
import { getUser, getAccessToken } from '../../src/lib/auth';

interface Message {
  id: string;
  body: string;
  senderCompanyId: string;
  maskedContact: boolean;
  createdAt: string;
  senderCompany?: { id: string; name: string };
}

function getSocketUrl(): string {
  const base: string = (api.defaults.baseURL as string) ?? '';
  return base.replace('/api/v1', '');
}

export default function ChatScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const qc = useQueryClient();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    getUser().then((u) => setCompanyId(u?.companyId ?? null));
  }, []);

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['chat', tripId],
    queryFn: () => api.get(`/messages/trip/${tripId}`).then((r) => r.data ?? []),
    enabled: !!tripId,
  });

  // Realtime: suscribe al room del viaje y agrega mensajes entrantes
  useEffect(() => {
    if (!tripId) return;
    let active = true;
    (async () => {
      const token = await getAccessToken();
      if (!active) return;
      const socket = io(`${getSocketUrl()}/tracking`, {
        transports: ['websocket'],
        auth: { token },
        reconnection: true,
      });
      socketRef.current = socket;
      socket.on('connect', () => socket.emit('subscribe-trip', tripId));
      socket.on('message', (msg: Message) => {
        qc.setQueryData<Message[]>(['chat', tripId], (prev = []) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      });
    })();
    return () => {
      active = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [tripId, qc]);

  const sendMutation = useMutation({
    mutationFn: (body: string) => api.post(`/messages/trip/${tripId}`, { body }).then((r) => r.data),
    onSuccess: (msg: Message) => {
      qc.setQueryData<Message[]>(['chat', tripId], (prev = []) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setText('');
    },
    onError: (e: any) => {
      // Re-muestra el texto si falló
      alert(getApiErrorMessage(e, 'No se pudo enviar el mensaje.'));
    },
  });

  const send = useCallback(() => {
    const body = text.trim();
    if (!body || sendMutation.isPending) return;
    sendMutation.mutate(body);
  }, [text, sendMutation]);

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Mensajes', headerTintColor: '#1e3a8a' }} />
      <StatusBar barStyle="dark-content" />

      {/* Aviso anti-fraude */}
      <View style={s.notice}>
        <ShieldAlert size={14} color="#854d0e" />
        <Text style={s.noticeText}>
          Coordiná dentro de LOGIGUAY. Los datos de contacto se ocultan automáticamente.
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading ? (
          <View style={s.centered}><ActivityIndicator size="large" color="#1e3a8a" /></View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={messages.length === 0 ? s.emptyContainer : s.list}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyIcon}>💬</Text>
                <Text style={s.emptyTitle}>Sin mensajes aún</Text>
                <Text style={s.emptySub}>Escribí para coordinar la carga, horarios o detalles del viaje.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const mine = item.senderCompanyId === companyId;
              return (
                <View style={[s.bubbleRow, mine ? s.rowMine : s.rowTheirs]}>
                  <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
                    {!mine && item.senderCompany?.name && (
                      <Text style={s.sender}>{item.senderCompany.name}</Text>
                    )}
                    <Text style={[s.body, mine && s.bodyMine]}>{item.body}</Text>
                    {item.maskedContact && (
                      <View style={s.maskedRow}>
                        <Info size={11} color={mine ? '#cbd5e1' : '#9ca3af'} />
                        <Text style={[s.maskedText, mine && { color: '#cbd5e1' }]}>Contacto oculto</Text>
                      </View>
                    )}
                    <Text style={[s.time, mine && s.timeMine]}>{formatTime(item.createdAt)}</Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder="Escribí un mensaje..."
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!text.trim() || sendMutation.isPending) && s.sendBtnDisabled]}
            onPress={send}
            disabled={!text.trim() || sendMutation.isPending}
          >
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notice: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fef9c3', paddingHorizontal: 14, paddingVertical: 8,
  },
  noticeText: { fontSize: 11.5, color: '#854d0e', flex: 1, lineHeight: 16 },
  list: { padding: 14, gap: 8 },
  emptyContainer: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 40 },
  bubbleRow: { flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9 },
  bubbleMine: { backgroundColor: '#1e3a8a', borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e5e7eb' },
  sender: { fontSize: 11, fontWeight: '700', color: '#1e3a8a', marginBottom: 2 },
  body: { fontSize: 15, color: '#111827', lineHeight: 20 },
  bodyMine: { color: '#fff' },
  maskedRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  maskedText: { fontSize: 10, color: '#9ca3af', fontStyle: 'italic' },
  time: { fontSize: 10, color: '#9ca3af', marginTop: 3, alignSelf: 'flex-end' },
  timeMine: { color: '#cbd5e1' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb',
  },
  input: {
    flex: 1, backgroundColor: '#f3f4f6', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 110, color: '#111827',
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#1e3a8a',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#cbd5e1' },
});
