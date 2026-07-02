import { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { T } from '../lib/theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Captura excepciones lanzadas durante el render de cualquier hijo.
 *
 * Sin esto, un error de render (ej: `trip.cargo.type` cuando `cargo` es null por
 * una respuesta inesperada del backend) tumba toda la app a una pantalla roja en
 * dev o a una pantalla en blanco en producción, sin forma de recuperarse salvo
 * cerrar y reabrir. Con el boundary, el usuario ve un mensaje claro y un botón
 * para reintentar sin perder la sesión.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // Punto de enganche para Sentry/analytics cuando se integre en mobile.
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary] render crash:', error);
    }
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <Text style={s.icon}>⚠️</Text>
          <Text style={s.title}>Algo no funcionó como esperábamos</Text>
          <Text style={s.sub}>
            Ocurrió un error inesperado en la pantalla. Tu sesión sigue activa.
          </Text>
          <TouchableOpacity style={s.btn} onPress={this.reset} activeOpacity={0.85}>
            <Text style={s.btnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, backgroundColor: T.bgApp },
  icon: { fontSize: 44, marginBottom: 16 },
  title: { fontSize: T.fontSizeLg, fontWeight: '800', color: T.textPrimary, textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: T.fontSizeSm, color: T.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  btn: { backgroundColor: T.textPrimary, borderRadius: T.radius, paddingHorizontal: 36, paddingVertical: 14 },
  btnText: { color: '#fff', fontSize: T.fontSizeMd, fontWeight: '700' },
});
