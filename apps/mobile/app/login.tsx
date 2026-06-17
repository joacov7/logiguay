import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { login } from '../src/lib/auth';
import { T } from '../src/lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) { setError('Completá todos los campos.'); return; }
    setLoading(true); setError(null);
    try {
      const user = await login(email.trim(), password);
      router.replace(
        user.role === 'DADOR' ? '/(dador)/' :
        user.role === 'CHOFER' ? '/(chofer)/' : '/(transportista)/'
      );
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Credenciales incorrectas. Revisá tu email y contraseña.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bgApp} />
      <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Logo */}
        <View style={s.logoArea}>
          <View style={s.logoMark}>
            <Text style={s.logoLetterL}>L</Text>
          </View>
          <Text style={s.appName}>LOGIGUAY</Text>
          <Text style={s.tagline}>Plataforma logística</Text>
        </View>

        {/* Form */}
        <View style={s.form}>
          {error && (
            <View style={s.errorBanner}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <Text style={s.label}>CORREO ELECTRÓNICO</Text>
          <TextInput
            style={[s.input, emailFocused && s.inputFocused]}
            placeholder="correo@empresa.com"
            placeholderTextColor={T.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
          />

          <Text style={[s.label, { marginTop: 14 }]}>CONTRASEÑA</Text>
          <TextInput
            style={[s.input, passwordFocused && s.inputFocused]}
            placeholder="Tu contraseña"
            placeholderTextColor={T.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
          />

          <TouchableOpacity style={s.forgotWrap}>
            <Text style={s.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.loginBtn, loading && s.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.loginBtnText}>Ingresar</Text>}
          </TouchableOpacity>
        </View>

        <View style={s.bottom}>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={s.registerText}>
              ¿No tenés cuenta? <Text style={s.registerLink}>Registrate</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bgApp },
  kav: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },

  logoArea: { alignItems: 'center', marginBottom: 48 },
  logoMark: {
    width: 64, height: 64, borderRadius: T.radius,
    backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  logoLetterL: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  appName: {
    fontSize: 22, fontWeight: '800', color: T.textPrimary,
    letterSpacing: 6, marginBottom: 6,
  },
  tagline: { fontSize: T.fontSizeSm, color: T.textMuted, letterSpacing: 1 },

  form: { marginBottom: 24 },
  errorBanner: {
    borderLeftWidth: 3, borderLeftColor: T.statusDanger,
    backgroundColor: '#FEF2F2', padding: 12,
    borderRadius: T.radiusSm, marginBottom: 20,
  },
  errorText: { color: T.statusDanger, fontSize: T.fontSizeSm },

  label: {
    fontSize: 10, fontWeight: '700', color: T.textMuted,
    letterSpacing: 1.2, marginBottom: 8,
  },
  input: {
    borderWidth: 1, borderColor: T.border, borderRadius: T.radius,
    paddingHorizontal: T.spaceMd, paddingVertical: 14,
    fontSize: T.fontSizeMd, color: T.textPrimary, backgroundColor: T.bgCard,
  },
  inputFocused: { borderColor: T.textPrimary },

  forgotWrap: { alignItems: 'flex-end', marginTop: 10, marginBottom: 24 },
  forgotText: { fontSize: T.fontSizeSm, color: T.textSecondary },

  loginBtn: {
    backgroundColor: T.textPrimary, borderRadius: T.radius,
    minHeight: 50, alignItems: 'center', justifyContent: 'center',
  },
  loginBtnDisabled: { opacity: 0.5 },
  loginBtnText: { color: '#fff', fontSize: T.fontSizeMd, fontWeight: '700', letterSpacing: 0.5 },

  bottom: { alignItems: 'center', marginTop: 8 },
  registerText: { fontSize: T.fontSizeSm, color: T.textMuted },
  registerLink: { color: T.textPrimary, fontWeight: '700' },
});
