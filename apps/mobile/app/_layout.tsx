'use client';
import { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { User } from '../src/lib/types';
import api, { isNetworkError } from '../src/lib/api';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { NetworkProvider } from '../src/lib/network';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Defaults endurecidos: reintentos solo para fallos de red (no para 4xx),
// con backoff, y refetch al volver el foco para datos siempre frescos.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => isNetworkError(error) && failureCount < 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0, // nunca reintentar mutaciones automáticamente (evita duplicados)
    },
  },
});

// Puente AppState → react-query: marca la app como "enfocada" para que las
// queries se refresquen cuando el usuario vuelve a primer plano.
function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === 'active');
}

async function registerPushToken(_user: User) {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const tokenData = await Notifications.getExpoPushTokenAsync();
    await api.post('/users/push-token', { token: tokenData.data });
  } catch {
    // No bloquear el inicio si falla el registro de push
  }
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const [checked, setChecked] = useState(false);

  const verifySession = useCallback(async () => {
    const [token, userRaw] = await AsyncStorage.multiGet(['accessToken', 'user']);
    const accessToken = token[1];
    let user: User | null = null;
    try {
      user = userRaw[1] ? (JSON.parse(userRaw[1]) as User) : null;
    } catch {
      user = null; // 'user' corrupto en disco: tratamos como no autenticado
    }

    const inAuth = segments[0] === 'login' || segments[0] === 'register';

    if (!accessToken || !user) {
      if (!inAuth) router.replace('/login');
    } else {
      registerPushToken(user);
      if (inAuth) {
        router.replace(
          user.role === 'DADOR' ? '/(dador)/' :
          user.role === 'CHOFER' ? '/(chofer)/' :
          '/(transportista)/',
        );
      }
    }
    setChecked(true);
  }, [segments, router]);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  if (!checked) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <NetworkProvider>
          <AuthGuard>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="login" />
              <Stack.Screen name="register" />
              <Stack.Screen name="(transportista)" />
              <Stack.Screen name="(dador)" />
              <Stack.Screen name="(chofer)" />
              <Stack.Screen name="trip/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="chat/[tripId]" options={{ headerShown: true }} />
            </Stack>
          </AuthGuard>
        </NetworkProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
