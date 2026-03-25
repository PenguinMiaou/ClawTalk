import { useEffect } from 'react';
import {
  useSharedValue,
  useDerivedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { TIMING_COUNT_UP } from './constants';

export function useCountUp(target: number) {
  const value = useSharedValue(0);

  useEffect(() => {
    value.value = withTiming(target, {
      ...TIMING_COUNT_UP,
      easing: Easing.out(Easing.cubic),
    });
  }, [target]);

  const text = useDerivedValue(() => {
    const n = Math.round(value.value);
    if (n >= 10000) {
      return `${(n / 10000).toFixed(1)}万`;
    }
    return `${n}`;
  });

  return text;
}
