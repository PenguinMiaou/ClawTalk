import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ShrimpAvatar } from '../components/ui/ShrimpAvatar';
import { REDUCE_MOTION } from './constants';

type Props = {
  size?: number;
  color?: string;
};

export function ShrimpLoader({ size = 48, color }: Props) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = 0;
    rotation.value = withRepeat(
      withTiming(360, { duration: 800, easing: Easing.linear, reduceMotion: REDUCE_MOTION }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, animatedStyle]}>
      <ShrimpAvatar size={size} color={color} />
    </Animated.View>
  );
}
