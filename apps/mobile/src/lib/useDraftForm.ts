import { useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Estado de formulario persistido en disco.
 *
 * Problema que resuelve: en Android, el SO puede destruir la Activity de la app
 * en segundo plano para liberar memoria. Cuando el usuario vuelve, React se
 * remonta desde cero y todo lo que escribió en un `useState` se pierde. Para un
 * dador cargando una carga larga (origen, destino, peso, descripción), eso es
 * una experiencia frustrante que puede costar una publicación.
 *
 * Esta versión guarda el borrador en AsyncStorage (debounced) y lo restaura al
 * montar. Cuando el formulario se envía con éxito, se llama a `clearDraft()`.
 *
 * @param key     clave única de almacenamiento (ej: 'draft:nueva-carga')
 * @param initial estado inicial vacío
 */
export function useDraftForm<T extends object>(key: string, initial: T) {
  const [form, setForm] = useState<T>(initial);
  const [restored, setRestored] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restaurar borrador al montar
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (mounted && raw) {
          const parsed = JSON.parse(raw) as T;
          setForm((prev) => ({ ...prev, ...parsed }));
        }
      } catch {
        // Borrador corrupto: lo ignoramos y arrancamos limpio.
      } finally {
        if (mounted) setRestored(true);
      }
    })();
    return () => { mounted = false; };
  }, [key]);

  // Persistir con debounce (evita escribir en disco en cada tecla)
  useEffect(() => {
    if (!restored) return; // no sobrescribir el borrador antes de restaurarlo
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(key, JSON.stringify(form)).catch(() => {});
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [form, key, restored]);

  const clearDraft = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setForm(initial);
    try { await AsyncStorage.removeItem(key); } catch { /* noop */ }
    // initial es estable a nivel de llamada; no lo incluimos en deps para no
    // recrear la función en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { form, setForm, clearDraft, restored };
}
