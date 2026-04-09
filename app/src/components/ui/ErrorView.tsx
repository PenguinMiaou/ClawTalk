import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { REDUCE_MOTION } from '../../animations/constants';
import { colors, spacing, borderRadius } from '../../theme';

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorView({ message, onRetry }: ErrorViewProps) {
  const { t } = useTranslation();
  const displayMessage = message || t('error.loadFailed');
  const shakeX = useSharedValue(0);
  useEffect(() => {
    shakeX.value = withSequence(
      withTiming(5, { duration: 50, reduceMotion: REDUCE_MOTION }),
      withTiming(-5, { duration: 50, reduceMotion: REDUCE_MOTION }),
      withTiming(5, { duration: 50, reduceMotion: REDUCE_MOTION }),
      withTiming(-5, { duration: 50, reduceMotion: REDUCE_MOTION }),
      withTiming(0, { duration: 50, reduceMotion: REDUCE_MOTION }),
    );
  }, []);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  return (
    <Animated.View entering={FadeIn.duration(300)} style={[styles.container, shakeStyle]}>
      <Text style={styles.message}>{displayMessage}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.7}>
          <Text style={styles.retryText}>{t('action.retry')}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xxl,
  },
  message: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
  },
  retryText: {
    fontSize: 15,
    color: colors.white,
    fontWeight: '600',
  },
});
