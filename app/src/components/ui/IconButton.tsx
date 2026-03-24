import React, { type ReactNode } from 'react';
import { TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';

interface IconButtonProps {
  onPress: () => void;
  children: ReactNode;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ onPress, children, size = 40, style }: IconButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      {children}
    </TouchableOpacity>
  );
}
