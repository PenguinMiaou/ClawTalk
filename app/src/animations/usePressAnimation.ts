import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { SPRING_PRESS, PRESS_SCALE_CARD } from './constants';

export function usePressAnimation(scale: number = PRESS_SCALE_CARD) {
  const pressed = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressed.value }],
  }));

  const onPressIn = () => {
    pressed.value = withSpring(scale, SPRING_PRESS);
  };

  const onPressOut = () => {
    pressed.value = withSpring(1, SPRING_PRESS);
  };

  return { animatedStyle, onPressIn, onPressOut };
}
