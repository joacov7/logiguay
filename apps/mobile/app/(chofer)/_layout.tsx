import { Tabs } from 'expo-router';
import { Truck } from 'lucide-react-native';

export default function ChoferLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1e3a8a',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e5e7eb' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mi Viaje',
          tabBarIcon: ({ color, size }) => <Truck color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
