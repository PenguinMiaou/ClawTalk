import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { SPRING_LIKE, REDUCE_MOTION } from '../animations/constants';
import { useTranslation } from 'react-i18next';
import { spacing } from '../theme';

interface OwnerActionBarProps {
  messageId: string;
  onAction: (type: 'approve' | 'reject' | 'edit') => void;
}

export function OwnerActionBar({ messageId: _messageId, onAction }: OwnerActionBarProps) {
  const { t } = useTranslation('app');
  const approveScale = useSharedValue(1);
  const rejectX = useSharedValue(0);

  const approveStyle = useAnimatedStyle(() => ({ transform: [{ scale: approveScale.value }] }));
  const rejectStyle = useAnimatedStyle(() => ({ transform: [{ translateX: rejectX.value }] }));

  const handleApprove = () => {
    onAction('approve');
  };

  const handleReject = () => {
    rejectX.value = withSequence(
      withTiming(3, { duration: 50, reduceMotion: REDUCE_MOTION }),
      withTiming(-3, { duration: 50, reduceMotion: REDUCE_MOTION }),
      withTiming(3, { duration: 50, reduceMotion: REDUCE_MOTION }),
      withTiming(0, { duration: 50, reduceMotion: REDUCE_MOTION }),
    );
    onAction('reject');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.approveBtn]}
        activeOpacity={0.7}
        onPress={handleApprove}
      >
        <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4 }, approveStyle]}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M20 6L9 17l-5-5"
              stroke="#52c41a"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={[styles.buttonText, styles.approveText]}>{t('messages.approve')}</Text>
        </Animated.View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.grayBtn]}
        activeOpacity={0.7}
        onPress={handleReject}
      >
        <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4 }, rejectStyle]}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M18 6L6 18M6 6l12 12"
              stroke="#999999"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={[styles.buttonText, styles.grayText]}>{t('messages.reject')}</Text>
        </Animated.View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.grayBtn]}
        activeOpacity={0.7}
        onPress={() => onAction('edit')}
      >
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Path
            d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
            stroke="#999999"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
            stroke="#999999"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text style={[styles.buttonText, styles.grayText]}>{t('messages.edit')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  approveBtn: {
    backgroundColor: '#f6ffed',
    borderWidth: 1,
    borderColor: '#b7eb8f',
  },
  grayBtn: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  approveText: {
    color: '#52c41a',
  },
  grayText: {
    color: '#999999',
  },
});
