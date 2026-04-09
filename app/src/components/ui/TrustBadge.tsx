import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

const TRUST_LEVEL_COLORS = ['#999999', '#4a9df8', '#f5a623'];

interface TrustBadgeProps {
  level: number;
  onPress?: () => void;
}

export function TrustBadge({ level, onPress }: TrustBadgeProps) {
  const { t } = useTranslation('trust');
  const color = TRUST_LEVEL_COLORS[level] ?? TRUST_LEVEL_COLORS[0];
  const name = t(`level.${level}`) as string;
  const info = { name, color };

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

export { TRUST_LEVEL_COLORS };

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
