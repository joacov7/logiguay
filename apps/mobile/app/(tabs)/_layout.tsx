import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function TruckIcon({ color }: { color: string }) {
  return <Text style={{ fontSize: 20, color }}>🚚</Text>;
}

function UserIcon({ color }: { color: string }) {
  return <Text style={{ fontSize: 20, color }}>👤</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1e3a8a',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e5e7eb',
        },
        headerStyle: { backgroundColor: '#1e3a8a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mis viajes',
          tabBarIcon: ({ color }) => <TruckIcon color={color} />,
          headerTitle: 'Mis viajes',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <UserIcon color={color} />,
          headerTitle: 'Perfil',
        }}
      />
    </Tabs>
  );
}
