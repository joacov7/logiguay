'use client';
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { User } from '../src/lib/types';
import api from '../src/lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const queryClient = new QueryClient();

async function registerPushToken(user: User) {
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

  useEffect(() => {
    (async () => {
      const [token, userRaw] = await AsyncStorage.multiGet(['accessToken', 'user']);
      const accessToken = token[1];
      const user: User | null = userRaw[1] ? JSON.parse(userRaw[1]) : null;

      const inAuth = segments[0] === 'login' || segments[0] === 'register';

      if (!accessToken || !user) {
        if (!inAuth) router.replace('/login');
      } else {
        // Registrar push token en background
        registerPushToken(user);

        if (inAuth) {
          // Redirigir a la sección correcta según el rol
          router.replace(
            user.role === 'DADOR' ? '/(dador)/' :
            user.role === 'CHOFER' ? '/(chofer)/' :
            '/(transportista)/'
          );
        }
      }
      setChecked(true);
    })();
  }, []);

  if (!checked) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(transportista)" />
          <Stack.Screen name="(dador)" />
          <Stack.Screen name="(chofer)" />
          <Stack.Screen
            name="trip/[id]"
            options={{
              headerShown: true,
              title: 'Detalle del viaje',
              headerBackTitle: 'Volver',
              headerStyle: { backgroundColor: '#fff' },
              headerTintColor: '#1e3a8a',
            }}
          />
        </Stack>
      </AuthGuard>
    </QueryClientProvider>
  );
}
