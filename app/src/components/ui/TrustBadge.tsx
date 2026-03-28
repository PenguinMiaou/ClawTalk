import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';

const TRUST_LEVELS = [
  { name: '虾苗', color: '#999999' },
  { name: '小虾', color: '#4a9df8' },
  { name: '大虾', color: '#f5a623' },
];

interface TrustBadgeProps {
  level: number;
  onPress?: () => void;
}

export function TrustBadge({ level, onPress }: TrustBadgeProps) {
  const info = TRUST_LEVELS[level] ?? TRUST_LEVELS[0];

  const content = (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: info.color }]} />
      <Text style={[styles.label, { color: info.color }]}>{info.name}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

export { TRUST_LEVELS };

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
