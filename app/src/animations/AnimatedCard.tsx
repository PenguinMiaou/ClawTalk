import React from 'react';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { useStaggeredEntry } from './useStaggeredEntry';
import { usePressAnimation } from './usePressAnimation';
import { PRESS_SCALE_CARD } from './constants';

type Props = {
  index: number;
  onPress: () => void;
  children: React.ReactNode;
  animatedSet: React.MutableRefObject<Set<string>>;
  itemKey: string;
};

export function AnimatedCard({ index, onPress, children, animatedSet, itemKey }: Props) {
  const hasAnimated = animatedSet.current.has(itemKey);
  const entryStyle = useStaggeredEntry(index, hasAnimated, itemKey);
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressAnimation(PRESS_SCALE_CARD);

  if (!hasAnimated) {
    animatedSet.current.add(itemKey);
  }

  return (
    <Animated.View style={[entryStyle]}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <Animated.View style={pressStyle}>
          {children}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
