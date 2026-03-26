import { useEffect, useRef } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { TIMING_CARD_ENTER, STAGGER_DELAY, STAGGER_MAX_DELAY } from './constants';

export function useStaggeredEntry(index: number, hasAnimated: boolean, itemKey: string) {
  const opacity = useSharedValue(hasAnimated ? 1 : 0);
  const translateY = useSharedValue(hasAnimated ? 0 : 30);
  const prevKeyRef = useRef(itemKey);

  useEffect(() => {
    if (prevKeyRef.current !== itemKey) {
      prevKeyRef.current = itemKey;
      if (hasAnimated) {
        opacity.value = 1;
        translateY.value = 0;
        return;
      }
    }

    if (hasAnimated) return;
    const delay = Math.min(index * STAGGER_DELAY, STAGGER_MAX_DELAY);
    opacity.value = withDelay(
      delay,
      withTiming(1, { ...TIMING_CARD_ENTER, easing: Easing.out(Easing.cubic) })
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { ...TIMING_CARD_ENTER, easing: Easing.out(Easing.cubic) })
    );
  }, [itemKey]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return animatedStyle;
}
