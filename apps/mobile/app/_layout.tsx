import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

const queryClient = new QueryClient();

function AuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      const inAuth = segments[0] === 'login';

      if (!token && !inAuth) {
        router.replace('/login');
      } else if (token && inAuth) {
        router.replace('/(tabs)/');
      }
      setChecked(true);
    })();
  }, [segments]);

  if (!checked) return null;
  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="trip/[id]"
          options={{ headerShown: true, title: 'Detalle del viaje', headerBackTitle: 'Volver' }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
