import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getUser, logout } from '../../src/lib/auth';
import { Avatar } from '../../src/components/ui';

const MenuItem = ({ icon, label, onPress, danger }: { icon: string; label: string; onPress: () => void; danger?: boolean }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <Ionicons name={icon as any} size={20} color={danger ? '#ef4444' : '#374151'} />
    <Text style={[styles.menuLabel, danger && { color: '#ef4444' }]}>{label}</Text>
    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
  </TouchableOpacity>
);

export default function PerfilScreen() {
  const router = useRouter();
  const user = getUser();

  const fullName = user?.name ?? [user?.firstName, user?.lastName].filter(Boolean).join(' ') ?? 'Usuario';
  const email = user?.email ?? '';
  const companyName = user?.company?.name ?? user?.companyName ?? '';
  const initials = fullName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar initials={initials} size={72} />
        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.email}>{email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>Transportista</Text>
        </View>
        {companyName ? <Text style={styles.company}>{companyName}</Text> : null}
      </View>

      <View style={styles.menu}>
        <MenuItem icon="business-outline" label="Mi empresa" onPress={() => {}} />
        <MenuItem icon="notifications-outline" label="Notificaciones" onPress={() => {}} />
        <MenuItem icon="help-circle-outline" label="Ayuda" onPress={() => {}} />
        <MenuItem icon="log-out-outline" label="Cerrar sesión" onPress={handleLogout} danger />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { alignItems: 'center', paddingTop: 64, paddingBottom: 24, paddingHorizontal: 16 },
  name: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 12 },
  email: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  roleBadge: { backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginTop: 8 },
  roleText: { fontSize: 12, fontWeight: '600', color: '#166534' },
  company: { fontSize: 13, color: '#6B7280', marginTop: 6 },
  menu: { marginTop: 16, backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6', minHeight: 48 },
  menuLabel: { fontSize: 15, color: '#111827', marginLeft: 12 },
});
