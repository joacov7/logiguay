import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getUser, logout } from '../../src/lib/auth';
import { User } from '../../src/lib/types';

const ROLE_LABEL: Record<string, string> = {
  DADOR: 'Dador de carga',
  TRANSPORTISTA: 'Transportista',
  CHOFER: 'Chofer',
  ADMIN: 'Administrador',
};

const ROLE_COLOR: Record<string, { bg: string; text: string }> = {
  DADOR:        { bg: '#dbeafe', text: '#1e40af' },
  TRANSPORTISTA:{ bg: '#dcfce7', text: '#166534' },
  CHOFER:       { bg: '#fef9c3', text: '#854d0e' },
  ADMIN:        { bg: '#fce7f3', text: '#9d174d' },
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUser().then((u) => { setUser(u); setLoading(false); });
  }, []);

  function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Confirmás que querés salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/login'); },
      },
    ]);
  }

  if (loading) {
    return <View style={s.centered}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
  }

  if (!user) {
    return (
      <View style={s.centered}>
        <Text style={s.errorText}>No se pudo cargar el perfil.</Text>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const roleColors = ROLE_COLOR[user.role] ?? { bg: '#f3f4f6', text: '#6b7280' };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={s.header}>
        <Text style={s.headerTitle}>Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {`${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={s.name}>{`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Usuario'}</Text>
        <View style={[s.roleBadge, { backgroundColor: roleColors.bg }]}>
          <Text style={[s.roleText, { color: roleColors.text }]}>
            {ROLE_LABEL[user.role] ?? user.role}
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Información de cuenta</Text>
          <InfoRow label="Email" value={user.email} />
          {user.companyId && (
            <InfoRow label="ID Empresa" value={user.companyId.slice(0, 12) + '...'} />
          )}
          {user.driverId && (
            <InfoRow label="ID Chofer" value={user.driverId.slice(0, 12) + '...'} />
          )}
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <Text style={s.version}>LOGIGUAY v1.0</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
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
  name: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  roleBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 24 },
  roleText: { fontSize: 13, fontWeight: '700' },
  card: {
    width: '100%', backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase',
    letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  infoRow: {
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  infoLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#111827', fontWeight: '500' },
  logoutBtn: {
    width: '100%', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', borderWidth: 1, borderColor: '#fecaca', marginBottom: 16,
  },
  logoutText: { color: '#dc2626', fontSize: 16, fontWeight: '700' },
  errorText: { fontSize: 16, color: '#6b7280', marginBottom: 24 },
  version: { fontSize: 12, color: '#d1d5db' },
});
