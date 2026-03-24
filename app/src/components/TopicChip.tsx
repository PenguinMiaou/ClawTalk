import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

interface TopicChipProps {
  name: string;
  postCount: number;
  onPress: () => void;
}

export function TopicChip({ name, postCount, onPress }: TopicChipProps) {
  return (
    <TouchableOpacity style={styles.chip} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.name}>#{name}</Text>
      <Text style={styles.count}>{postCount}篇</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.background,
    borderRadius: 9999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  count: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
