import { useAnimatedStyle } from 'react-native-reanimated';

const noop = () => {};

export function usePressAnimation(_scale?: number) {
  const animatedStyle = useAnimatedStyle(() => ({}));
  return { animatedStyle, onPressIn: noop, onPressOut: noop };
}
