import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { T } from './theme';

interface NetworkState {
  isConnected: boolean;
}

const NetworkContext = createContext<NetworkState>({ isConnected: true });

export function useNetwork() {
  return useContext(NetworkContext);
}

/**
 * Escucha el estado de conectividad del dispositivo y:
 *   1) expone `isConnected` a toda la app vía contexto,
 *   2) muestra un banner persistente "Sin conexión" cuando se cae la red,
 *   3) sincroniza el `onlineManager` de react-query para que las queries se
 *      pausen sin disparar errores y se reactiven solas al volver la conexión.
 *
 * Esto evita que el usuario quede mirando un spinner infinito o un error
 * confuso cuando en realidad simplemente perdió la señal (túnel, ascensor,
 * zona rural — escenarios reales para choferes en ruta).
 */
export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(true);
  const slideAnim = useRef(new Animated.Value(-40)).current;

  useEffect(() => {
    // Puente entre NetInfo y react-query: las queries no se ejecutan offline.
    // onlineManager guarda internamente el cleanup que devuelve este setup.
    onlineManager.setEventListener((setOnline) =>
      NetInfo.addEventListener((state) => {
        setOnline(!!state.isConnected);
      }),
    );

    const unsubscribe = NetInfo.addEventListener((state) => {
      // `isConnected` puede ser null brevemente al iniciar; lo tratamos como online.
      const connected = state.isConnected !== false;
      setIsConnected(connected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isConnected ? -40 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isConnected, slideAnim]);

  return (
    <NetworkContext.Provider value={{ isConnected }}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[s.banner, { transform: [{ translateY: slideAnim }] }]}
      >
        <View style={s.dot} />
        <Text style={s.text}>Sin conexión a internet</Text>
      </Animated.View>
    </NetworkContext.Provider>
  );
}

const s = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: T.statusDanger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 6,
    zIndex: 9999,
    elevation: 9999,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  text: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
});
