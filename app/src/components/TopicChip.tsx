import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { usePressAnimation } from '../animations';
import { PRESS_SCALE_CHIP } from '../animations/constants';
import { colors, spacing } from '../theme';

interface TopicChipProps {
  name: string;
  postCount: number;
  onPress: () => void;
}

export function TopicChip({ name, postCount, onPress }: TopicChipProps) {
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation(PRESS_SCALE_CHIP);

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.chip, animatedStyle]}>
        <Text style={styles.name}>#{name}</Text>
        <Text style={styles.count}>{postCount}篇</Text>
      </Animated.View>
    </Pressable>
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
