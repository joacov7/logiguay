import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Truck, Package } from 'lucide-react-native';
import api from '../src/lib/api';
import { saveTokens } from '../src/lib/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Role = 'DADOR' | 'TRANSPORTISTA';

export default function RegisterScreen() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!role) return Alert.alert('Error', 'Seleccioná un rol');
    if (!firstName || !lastName || !email || !password)
      return Alert.alert('Error', 'Completá todos los campos obligatorios');
    if (password.length < 8)
      return Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres');
    if (password !== confirmPassword)
      return Alert.alert('Error', 'Las contraseñas no coinciden');

    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        firstName, lastName, email, phone, password, role,
      });
      const { accessToken, refreshToken, user } = res.data;
      await saveTokens(accessToken, refreshToken);
      await AsyncStorage.setItem('user', JSON.stringify({ ...user, companyId: null, driverId: null }));
      router.replace(role === 'DADOR' ? '/(dador)/' : '/(tabs)/');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <Text style={s.title}>Crear cuenta</Text>
      <Text style={s.subtitle}>Registrate en LOGIGUAY gratis</Text>

      {/* Role selector */}
      <Text style={s.label}>¿Cómo vas a usar Logiguay? *</Text>
      <View style={s.roleRow}>
        <TouchableOpacity
          style={[s.roleCard, role === 'DADOR' && s.roleCardActive]}
          onPress={() => setRole('DADOR')}
          activeOpacity={0.8}
        >
          <View style={[s.roleIcon, role === 'DADOR' && s.roleIconActive]}>
            <Package color={role === 'DADOR' ? '#fff' : '#6b7280'} size={22} />
          </View>
          <Text style={[s.roleTitle, role === 'DADOR' && s.roleTitleActive]}>Dador de carga</Text>
          <Text style={s.roleDesc}>Publico cargas y busco transportistas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.roleCard, role === 'TRANSPORTISTA' && s.roleCardActive]}
          onPress={() => setRole('TRANSPORTISTA')}
          activeOpacity={0.8}
        >
          <View style={[s.roleIcon, role === 'TRANSPORTISTA' && s.roleIconActive]}>
            <Truck color={role === 'TRANSPORTISTA' ? '#fff' : '#6b7280'} size={22} />
          </View>
          <Text style={[s.roleTitle, role === 'TRANSPORTISTA' && s.roleTitleActive]}>Transportista</Text>
          <Text style={s.roleDesc}>Tengo camiones y busco cargas</Text>
        </TouchableOpacity>
      </View>

      <View style={s.row}>
        <View style={s.half}>
          <Text style={s.label}>Nombre *</Text>
          <TextInput style={s.input} value={firstName} onChangeText={setFirstName} placeholder="Juan" />
        </View>
        <View style={s.half}>
          <Text style={s.label}>Apellido *</Text>
          <TextInput style={s.input} value={lastName} onChangeText={setLastName} placeholder="Pérez" />
        </View>
      </View>

      <Text style={s.label}>Email *</Text>
      <TextInput
        style={s.input} value={email} onChangeText={setEmail}
        placeholder="juan@ejemplo.com" keyboardType="email-address" autoCapitalize="none"
      />

      <Text style={s.label}>Teléfono</Text>
      <TextInput
        style={s.input} value={phone} onChangeText={setPhone}
        placeholder="+54 9 11..." keyboardType="phone-pad"
      />

      <Text style={s.label}>Contraseña *</Text>
      <TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Mínimo 8 caracteres" />

      <Text style={s.label}>Confirmar contraseña *</Text>
      <TextInput style={s.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Repetí la contraseña" />

      <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Registrarme</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/login')} style={s.loginLink}>
        <Text style={s.loginText}>¿Ya tenés cuenta? <Text style={s.loginBold}>Iniciar sesión</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', color: '#1e3a8a', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb',
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  roleCard: {
    flex: 1, borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 14,
    padding: 14, alignItems: 'center',
  },
  roleCardActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  roleIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  roleIconActive: { backgroundColor: '#2563eb' },
  roleTitle: { fontSize: 13, fontWeight: '700', color: '#374151', textAlign: 'center' },
  roleTitleActive: { color: '#1d4ed8' },
  roleDesc: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 3, lineHeight: 15 },
  btn: {
    backgroundColor: '#1e3a8a', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 24,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginLink: { alignItems: 'center', marginTop: 20 },
  loginText: { fontSize: 14, color: '#6b7280' },
  loginBold: { color: '#2563eb', fontWeight: '600' },
});
