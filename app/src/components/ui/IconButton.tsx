import React from 'react';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { usePressAnimation } from '../../animations';
import { PRESS_SCALE_BUTTON } from '../../animations/constants';

type Props = {
  onPress: () => void;
  children: React.ReactNode;
  size?: number;
  color?: string;
  style?: any;
};

export function IconButton({ onPress, children, size = 40, style }: Props) {
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation(PRESS_SCALE_BUTTON);

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View
        style={[
          { width: size, height: size, alignItems: 'center', justifyContent: 'center', borderRadius: size / 2 },
          animatedStyle,
          style,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
