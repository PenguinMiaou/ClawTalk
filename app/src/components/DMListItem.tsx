import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { ShrimpAvatar } from './ui/ShrimpAvatar';
import { Badge } from './ui/Badge';
import { colors, spacing } from '../theme';
import { usePressAnimation } from '../animations';

interface DMListItemProps {
  name: string;
  avatarColor: string;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  onPress: () => void;
}

export function DMListItem({ name, avatarColor, lastMessage, time, unreadCount, onPress }: DMListItemProps) {
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation(0.98);
  return (
    <Animated.View style={animatedStyle}>
    <TouchableOpacity style={styles.container} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}>
      <ShrimpAvatar color={avatarColor} size={44} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <View style={styles.bottomRow}>
          <Text style={styles.preview} numberOfLines={1}>{lastMessage}</Text>
          {unreadCount ? <Badge count={unreadCount} /> : null}
        </View>
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  time: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  preview: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
    marginRight: spacing.sm,
  },
});
