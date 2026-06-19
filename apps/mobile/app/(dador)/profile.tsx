import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getUser, logout } from '../../src/lib/auth';
import { User } from '../../src/lib/types';

function MenuItem({ icon, label, onPress, danger }: { icon: string; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress}>
      <Ionicons name={icon as any} size={20} color={danger ? '#ef4444' : '#1e3a8a'} />
      <Text style={[s.menuLabel, danger && { color: '#ef4444' }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  );
}

export default function DadorProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUser().then((u) => { setUser(u); setLoading(false); });
  }, []);

  function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Confirmás que querés salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  }

  if (loading) {
    return <View style={s.centered}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
  }

  const firstName = user?.firstName ?? '';
  const lastName = user?.lastName ?? '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Usuario';
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || '?';
  const email = user?.email ?? '';
  const companyName = (user as any)?.company?.name ?? (user as any)?.companyName ?? '';

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={s.header}>
        <Text style={s.headerTitle}>Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
        <Text style={s.name}>{fullName}</Text>
        {email ? <Text style={s.email}>{email}</Text> : null}
        <View style={s.roleBadge}><Text style={s.roleText}>Dador de carga</Text></View>
        {companyName ? <Text style={s.company}>{companyName}</Text> : null}

        <View style={s.card}>
          <MenuItem icon="star-outline" label="Mi reputación" onPress={() => router.push('/(dador)/reputacion')} />
          <View style={s.divider} />
          <MenuItem icon="cube-outline" label="Mis cargas" onPress={() => router.push('/(dador)')} />
          <View style={s.divider} />
          <MenuItem icon="add-circle-outline" label="Publicar carga" onPress={() => router.push('/(dador)/nueva-carga')} />
        </View>

        <View style={s.card}>
          <MenuItem icon="log-out-outline" label="Cerrar sesión" onPress={handleLogout} danger />
        </View>

        <Text style={s.version}>LOGIGUAY v1.0</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#fff', paddingHorizontal: 20,
    paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1e3a8a' },
  scroll: { padding: 16, alignItems: 'center', paddingBottom: 48 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#1e3a8a',
    alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  email: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  roleBadge: { backgroundColor: '#dbeafe', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 6 },
  roleText: { fontSize: 13, fontWeight: '700', color: '#1e40af' },
  company: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  card: {
    width: '100%', backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    marginBottom: 16, marginTop: 8, shadowColor: '#000', shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 15 },
  menuLabel: { fontSize: 15, color: '#111827', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 48 },
  version: { fontSize: 12, color: '#d1d5db', marginTop: 16 },
});
