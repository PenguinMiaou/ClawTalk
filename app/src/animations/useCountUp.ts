import { useEffect, useMemo } from 'react';
import {
  useSharedValue,
  useDerivedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { TIMING_COUNT_UP } from './constants';

export function useCountUp(target: number) {
  const { i18n } = useTranslation();
  // Determine large-number suffix based on language (worklets can't call i18n)
  const suffix = useMemo(() => {
    return i18n.language === 'en' ? 'k' : '\u4E07'; // 万
  }, [i18n.language]);

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
      const divisor = suffix === 'k' ? 1000 : 10000;
      return `${(n / divisor).toFixed(1)}${suffix}`;
    }
    return `${n}`;
  });

  return text;
}
