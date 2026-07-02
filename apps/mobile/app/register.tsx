import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, StatusBar, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Truck, Package, User as UserIcon, Eye, EyeOff } from 'lucide-react-native';
import api, { getApiErrorMessage } from '../src/lib/api';
import { saveTokens } from '../src/lib/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Role = 'DADOR' | 'TRANSPORTISTA' | 'CHOFER';

export default function RegisterScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 2 fields
  const [role, setRole] = useState<Role | null>(null);
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validateStep1(): string | null {
    if (!firstName.trim() || !lastName.trim()) return 'Ingresá tu nombre y apellido.';
    if (!email.trim()) return 'Ingresá tu email.';
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (password !== confirmPassword) return 'Las contraseñas no coinciden.';
    return null;
  }

  function goNext() {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError(null);
    setStep(2);
  }

  async function handleRegister() {
    if (!role) { setError('Seleccioná un rol para continuar.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/register', {
        firstName, lastName, email, phone, password, role,
      });
      const { accessToken, refreshToken, user } = res.data;
      await saveTokens(accessToken, refreshToken);
      await AsyncStorage.setItem('user', JSON.stringify({ ...user, companyId: null, driverId: null }));
      router.replace(
        role === 'DADOR' ? '/(dador)/' :
        role === 'CHOFER' ? '/(chofer)/' :
        '/(transportista)/'
      );
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Error al registrarse. Intentá de nuevo.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={s.header}>
          <Text style={s.appName}>Logiguay</Text>
          <Text style={s.headerSub}>Crear cuenta</Text>
        </View>

        {/* Progress bar */}
        <View style={s.progressWrap}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: step === 1 ? '50%' : '100%' }]} />
          </View>
          <Text style={s.progressLabel}>Paso {step} de 2</Text>
        </View>

        {/* Error */}
        {error ? (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {step === 1 ? (
          /* ── STEP 1: Personal info ── */
          <View>
            <View style={s.row}>
              <View style={s.half}>
                <Text style={s.label}>Nombre *</Text>
                <TextInput
                  style={s.input} value={firstName} onChangeText={setFirstName}
                  placeholder="Juan" placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={s.half}>
                <Text style={s.label}>Apellido *</Text>
                <TextInput
                  style={s.input} value={lastName} onChangeText={setLastName}
                  placeholder="Pérez" placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <Text style={s.label}>Email *</Text>
            <TextInput
              style={s.input} value={email} onChangeText={setEmail}
              placeholder="juan@ejemplo.com" placeholderTextColor="#9CA3AF"
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
            />

            <Text style={s.label}>Contraseña *</Text>
            <View style={s.passwordWrap}>
              <TextInput
                style={s.passwordInput} value={password} onChangeText={setPassword}
                placeholder="Mínimo 8 caracteres" placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={s.eyeBtn}>
                {showPassword
                  ? <EyeOff size={18} color="#6B7280" />
                  : <Eye size={18} color="#6B7280" />}
              </TouchableOpacity>
            </View>

            <Text style={s.label}>Confirmar contraseña *</Text>
            <View style={s.passwordWrap}>
              <TextInput
                style={s.passwordInput} value={confirmPassword} onChangeText={setConfirmPassword}
                placeholder="Repetí la contraseña" placeholderTextColor="#9CA3AF"
                secureTextEntry={!showConfirm}
              />
              <TouchableOpacity onPress={() => setShowConfirm(p => !p)} style={s.eyeBtn}>
                {showConfirm
                  ? <EyeOff size={18} color="#6B7280" />
                  : <Eye size={18} color="#6B7280" />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.primaryBtn} onPress={goNext} activeOpacity={0.85}>
              <Text style={s.primaryBtnText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── STEP 2: Role + phone ── */
          <View>
            <Text style={s.stepTitle}>¿Cómo vas a usar Logiguay?</Text>

            <TouchableOpacity
              style={[s.roleCard, role === 'DADOR' && s.roleCardActive]}
              onPress={() => setRole('DADOR')} activeOpacity={0.8}
            >
              <View style={[s.roleIconWrap, role === 'DADOR' && s.roleIconActive]}>
                <Package size={24} color={role === 'DADOR' ? '#fff' : '#6B7280'} />
              </View>
              <View style={s.roleText}>
                <Text style={[s.roleTitle, role === 'DADOR' && s.roleTitleActive]}>Dador de carga</Text>
                <Text style={s.roleDesc}>Tengo cargas para transportar</Text>
              </View>
              <View style={[s.radioOuter, role === 'DADOR' && s.radioOuterActive]}>
                {role === 'DADOR' && <View style={s.radioInner} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.roleCard, role === 'TRANSPORTISTA' && s.roleCardActive]}
              onPress={() => setRole('TRANSPORTISTA')} activeOpacity={0.8}
            >
              <View style={[s.roleIconWrap, role === 'TRANSPORTISTA' && s.roleIconActive]}>
                <Truck size={24} color={role === 'TRANSPORTISTA' ? '#fff' : '#6B7280'} />
              </View>
              <View style={s.roleText}>
                <Text style={[s.roleTitle, role === 'TRANSPORTISTA' && s.roleTitleActive]}>Transportista</Text>
                <Text style={s.roleDesc}>Tengo camiones y choferes</Text>
              </View>
              <View style={[s.radioOuter, role === 'TRANSPORTISTA' && s.radioOuterActive]}>
                {role === 'TRANSPORTISTA' && <View style={s.radioInner} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.roleCard, role === 'CHOFER' && s.roleCardActive]}
              onPress={() => setRole('CHOFER')} activeOpacity={0.8}
            >
              <View style={[s.roleIconWrap, role === 'CHOFER' && s.roleIconActive]}>
                <UserIcon size={24} color={role === 'CHOFER' ? '#fff' : '#6B7280'} />
              </View>
              <View style={s.roleText}>
                <Text style={[s.roleTitle, role === 'CHOFER' && s.roleTitleActive]}>Chofer</Text>
                <Text style={s.roleDesc}>Soy chofer profesional</Text>
              </View>
              <View style={[s.radioOuter, role === 'CHOFER' && s.radioOuterActive]}>
                {role === 'CHOFER' && <View style={s.radioInner} />}
              </View>
            </TouchableOpacity>

            <Text style={s.label}>Teléfono</Text>
            <TextInput
              style={s.input} value={phone} onChangeText={setPhone}
              placeholder="+54 9 11 1234-5678" placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />

            <View style={s.buttonRow}>
              <TouchableOpacity style={s.backBtn} onPress={() => { setStep(1); setError(null); }} activeOpacity={0.8}>
                <Text style={s.backBtnText}>Volver</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.primaryBtn, s.submitBtn, loading && s.primaryBtnDisabled]}
                onPress={handleRegister} disabled={loading} activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.primaryBtnText}>Registrarme</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity onPress={() => router.replace('/login')} style={s.loginLink}>
          <Text style={s.loginText}>
            ¿Ya tenés cuenta? <Text style={s.loginBold}>Iniciar sesión</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },
  content: { padding: 24, paddingTop: 20, paddingBottom: 48 },

  header: { marginBottom: 20 },
  appName: { fontSize: 22, fontWeight: '800', color: '#15A66A' },
  headerSub: { fontSize: 26, fontWeight: '800', color: '#111827', marginTop: 2 },

  progressWrap: { marginBottom: 24 },
  progressTrack: {
    height: 4, backgroundColor: '#E5E7EB', borderRadius: 999, overflow: 'hidden', marginBottom: 6,
  },
  progressFill: {
    height: '100%', backgroundColor: '#15A66A', borderRadius: 999,
  },
  progressLabel: { fontSize: 12, color: '#6B7280' },

  errorBanner: {
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { color: '#DC2626', fontSize: 13, textAlign: 'center' },

  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: 15,
    color: '#111827', backgroundColor: '#F9FAFB',
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },

  passwordWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    backgroundColor: '#F9FAFB', paddingRight: 12,
  },
  passwordInput: {
    flex: 1, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: '#111827',
  },
  eyeBtn: { padding: 4 },

  primaryBtn: {
    backgroundColor: '#15A66A', borderRadius: 12, minHeight: 48,
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
    shadowColor: '#15A66A', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  stepTitle: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 12 },

  roleCard: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14,
    padding: 16, marginBottom: 10, backgroundColor: '#fff',
  },
  roleCardActive: { borderColor: '#15A66A', backgroundColor: '#F0FDF4' },
  roleIconWrap: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  roleIconActive: { backgroundColor: '#15A66A' },
  roleText: { flex: 1 },
  roleTitle: { fontSize: 14, fontWeight: '700', color: '#374151' },
  roleTitleActive: { color: '#15A66A' },
  roleDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: '#15A66A' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#15A66A' },

  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  backBtn: {
    flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1.5,
    borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  submitBtn: { flex: 2, marginTop: 0 },

  loginLink: { alignItems: 'center', marginTop: 28 },
  loginText: { fontSize: 14, color: '#6B7280' },
  loginBold: { color: '#15A66A', fontWeight: '700' },
});
