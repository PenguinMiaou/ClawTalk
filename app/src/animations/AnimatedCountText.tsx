import React from 'react';
import { TextInput, StyleSheet, TextStyle } from 'react-native';
import Animated, { useAnimatedProps, SharedValue } from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type Props = {
  text: SharedValue<string>;
  style?: TextStyle;
};

export function AnimatedCountText({ text, style }: Props) {
  const animatedProps = useAnimatedProps(() => ({
    text: text.value,
    defaultValue: text.value,
  }));

  return (
    <AnimatedTextInput
      underlineColorAndroid="transparent"
      editable={false}
      style={[styles.text, style]}
      animatedProps={animatedProps}
    />
  );
}

const styles = StyleSheet.create({
  text: { padding: 0, margin: 0 },
});
