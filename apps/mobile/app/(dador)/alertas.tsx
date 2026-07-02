import { useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Package, Star, Calendar, CheckCircle } from 'lucide-react-native';
import api from '../../src/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, any> = {
  NUEVA_OFERTA: Package,
  VIAJE_INICIADO: Bell,
  TURNO: Calendar,
  CALIFICACION: Star,
};

export default function AlertasDadorScreen() {
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notificaciones-dador'],
    queryFn: () => api.get('/notifications').then((r) => r.data?.data ?? r.data ?? []),
  });

  const notifications: Notification[] = Array.isArray(data) ? data : [];

  const readMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones-dador'] }),
  });

  const readAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones-dador'] }),
  });

  const onRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (isLoading) {
    return <View style={s.centered}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.headerTitle}>Alertas</Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={() => readAllMutation.mutate()} style={s.readAllBtn}>
              <CheckCircle size={14} color="#1e3a8a" />
              <Text style={s.readAllText}>Marcar todo</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={s.headerSub}>
          {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
        </Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={notifications.length === 0 ? s.emptyContainer : s.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#1e3a8a" />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🔔</Text>
            <Text style={s.emptyTitle}>Sin alertas</Text>
            <Text style={s.emptySub}>Te notificaremos cuando haya novedades en tus cargas.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const Icon = TYPE_ICON[item.type] ?? Bell;
          const timeAgo = formatTimeAgo(item.createdAt);
          return (
            <TouchableOpacity
              style={[s.card, !item.read && s.cardUnread]}
              activeOpacity={0.7}
              onPress={() => { if (!item.read) readMutation.mutate(item.id); }}
            >
              <View style={[s.iconBox, !item.read && s.iconBoxUnread]}>
                <Icon size={18} color={item.read ? '#9ca3af' : '#1e3a8a'} />
              </View>
              <View style={s.content}>
                <View style={s.titleRow}>
                  <Text style={[s.title, !item.read && s.titleUnread]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!item.read && <View style={s.dot} />}
                </View>
                <Text style={s.body} numberOfLines={2}>{item.body}</Text>
                <Text style={s.time}>{timeAgo}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days} día${days !== 1 ? 's' : ''}`;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#fff', paddingHorizontal: 20,
    paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1e3a8a' },
  readAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readAllText: { fontSize: 13, color: '#1e3a8a', fontWeight: '600' },
  headerSub: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  list: { padding: 16, gap: 10 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 32 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 }, shadowRadius: 4,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: '#1e3a8a' },
  iconBox: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  iconBoxUnread: { backgroundColor: '#eff6ff' },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  title: { fontSize: 14, fontWeight: '600', color: '#6b7280', flex: 1 },
  titleUnread: { color: '#111827', fontWeight: '700' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1e3a8a', marginLeft: 6 },
  body: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  time: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
});
