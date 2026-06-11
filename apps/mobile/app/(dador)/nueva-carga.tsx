import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../src/lib/api';

const CARGO_TYPES = ['Cereal', 'Granos', 'Fertilizante', 'Combustible', 'Maquinaria', 'Refrigerados', 'General', 'Otro'];

interface FormState {
  type: string;
  originAddress: string;
  destinationAddress: string;
  weightTons: string;
  estimatedValue: string;
  requiredDate: string;
  description: string;
}

const EMPTY: FormState = {
  type: '', originAddress: '', destinationAddress: '',
  weightTons: '', estimatedValue: '', requiredDate: '', description: '',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  );
}

export default function NuevaCargaScreen() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  function set(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePublish(publish: boolean) {
    if (!form.type || !form.originAddress || !form.destinationAddress) {
      Alert.alert('Campos requeridos', 'Completá tipo, origen y destino.');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        type: form.type,
        originAddress: form.originAddress,
        destinationAddress: form.destinationAddress,
        description: form.description || undefined,
        weightTons: form.weightTons ? parseFloat(form.weightTons) : undefined,
        estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : undefined,
        requiredDate: form.requiredDate || undefined,
      };
      const res = await api.post('/cargo', payload);
      if (publish) {
        await api.patch(`/cargo/${res.data.id}/publish`);
      }
      Alert.alert(
        publish ? '¡Carga publicada!' : 'Guardado como borrador',
        publish
          ? 'Tu carga ya está visible para los transportistas.'
          : 'Podés publicarla desde la lista de cargas.',
        [{ text: 'OK', onPress: () => { setForm(EMPTY); router.replace('/(dador)/'); } }],
      );
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo guardar la carga.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={s.header}>
          <Text style={s.headerTitle}>Nueva carga</Text>
          <Text style={s.headerSub}>Completá los datos para publicar</Text>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Tipo de carga */}
          <Field label="Tipo de carga *">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips}>
              {CARGO_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => set('type', t)}
                  style={[s.chip, form.type === t && s.chipActive]}
                >
                  <Text style={[s.chipText, form.type === t && s.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Field>

          <Field label="Origen *">
            <TextInput
              style={s.input} value={form.originAddress} onChangeText={(v) => set('originAddress', v)}
              placeholder="Ciudad, provincia o dirección" placeholderTextColor="#9ca3af"
            />
          </Field>

          <Field label="Destino *">
            <TextInput
              style={s.input} value={form.destinationAddress} onChangeText={(v) => set('destinationAddress', v)}
              placeholder="Ciudad, provincia o dirección" placeholderTextColor="#9ca3af"
            />
          </Field>

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field label="Peso (toneladas)">
                <TextInput
                  style={s.input} value={form.weightTons} onChangeText={(v) => set('weightTons', v)}
                  placeholder="0" placeholderTextColor="#9ca3af" keyboardType="decimal-pad"
                />
              </Field>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Valor estimado (ARS)">
                <TextInput
                  style={s.input} value={form.estimatedValue} onChangeText={(v) => set('estimatedValue', v)}
                  placeholder="0" placeholderTextColor="#9ca3af" keyboardType="decimal-pad"
                />
              </Field>
            </View>
          </View>

          <Field label="Fecha requerida (AAAA-MM-DD)">
            <TextInput
              style={s.input} value={form.requiredDate} onChangeText={(v) => set('requiredDate', v)}
              placeholder="2025-08-15" placeholderTextColor="#9ca3af" keyboardType="numeric"
            />
          </Field>

          <Field label="Descripción adicional">
            <TextInput
              style={[s.input, s.textarea]} value={form.description} onChangeText={(v) => set('description', v)}
              placeholder="Instrucciones especiales, referencias, etc." placeholderTextColor="#9ca3af"
              multiline numberOfLines={3}
            />
          </Field>

          <View style={s.actions}>
            <TouchableOpacity
              style={[s.btnSecondary, saving && s.btnDisabled]}
              onPress={() => handlePublish(false)}
              disabled={saving}
            >
              <Text style={s.btnSecondaryText}>Guardar borrador</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btnPrimary, saving && s.btnDisabled]}
              onPress={() => handlePublish(true)}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnPrimaryText}>Publicar ahora</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: {
    backgroundColor: '#fff', paddingHorizontal: 20,
    paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1e3a8a' },
  headerSub: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 48, gap: 4 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#111827',
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row' },
  chip: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  row: { flexDirection: 'row' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnPrimary: {
    flex: 2, backgroundColor: '#1e3a8a', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
    shadowColor: '#1e3a8a', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnSecondary: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
    borderWidth: 1, borderColor: '#d1d5db',
  },
  btnSecondaryText: { color: '#374151', fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
});
