import { Tabs } from 'expo-router';
import { Package, ShoppingBag, Calendar, Truck, Bell, User } from 'lucide-react-native';

export default function DadorLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1e3a8a',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e5e7eb',
          elevation: 8,
          shadowOpacity: 0.1,
        },
        tabBarLabelStyle: { fontSize: 11 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Cargas',
          tabBarIcon: ({ color, size }) => <Package color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="bolsa"
        options={{
          title: 'Bolsa',
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="turnos"
        options={{
          title: 'Turnos',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="camiones"
        options={{
          title: 'Camiones',
          tabBarIcon: ({ color, size }) => <Truck color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="alertas"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <User color={color} size={size - 2} />,
        }}
      />

      {/* Pantallas sin tab */}
      <Tabs.Screen name="nueva-carga" options={{ href: null }} />
      <Tabs.Screen name="carga/[id]" options={{ href: null }} />
      <Tabs.Screen name="reputacion" options={{ href: null }} />
    </Tabs>
  );
}
