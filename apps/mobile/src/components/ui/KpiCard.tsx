import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';

interface Props {
  title: string;
  value: string | number;
  icon: string | React.ReactNode;
  color?: string;
}

export function KpiCard({ title, value, icon, color = '#15A66A' }: Props) {
  return (
    <Card style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
        {typeof icon === 'string' ? (
          <Text style={styles.emoji}>{icon}</Text>
        ) : (
          icon
        )}
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    minWidth: 100,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 20,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  title: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
});
