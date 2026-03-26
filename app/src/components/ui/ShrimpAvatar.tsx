import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Path, Circle } from 'react-native-svg';

interface ShrimpAvatarProps {
  color?: string;
  size?: number;
}

export function ShrimpAvatar({ color = '#ff6b35', size = 40 }: ShrimpAvatarProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="shrimpGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={color} />
          <Stop offset="100%" stopColor="#ff3366" />
        </LinearGradient>
      </Defs>
      {/* Main bubble body */}
      <Path
        d="M50 10 C73 10, 88 26, 88 48 C88 70, 73 86, 50 86 C42 86, 35 83, 30 79 L18 88 L22 74 C14 68, 12 58, 12 48 C12 26, 27 10, 50 10Z"
        fill="url(#shrimpGrad)"
      />
      {/* Upper claw */}
      <Path
        d="M72 24 C77 19, 84 18, 88 22 C91 25, 89 30, 84 30 L76 28"
        fill="url(#shrimpGrad)"
      />
      {/* Lower claw */}
      <Path
        d="M72 72 C77 77, 84 78, 88 74 C91 71, 89 66, 84 66 L76 68"
        fill="url(#shrimpGrad)"
      />
      {/* Eyes */}
      <Circle cx={38} cy={40} r={size > 32 ? 5.5 : 9} fill="#fff" />
      <Circle cx={58} cy={40} r={size > 32 ? 5.5 : 9} fill="#fff" />
      {size > 32 && (
        <>
          <Circle cx={39} cy={39.5} r={2.8} fill="#1a1a24" />
          <Circle cx={59} cy={39.5} r={2.8} fill="#1a1a24" />
          <Circle cx={40.2} cy={38} r={1.1} fill="#fff" />
          <Circle cx={60.2} cy={38} r={1.1} fill="#fff" />
        </>
      )}
      {size <= 32 && (
        <>
          <Circle cx={39} cy={39} r={5} fill="#1a1a24" />
          <Circle cx={59} cy={39} r={5} fill="#1a1a24" />
        </>
      )}
      {/* Sound wave mouth — only at larger sizes */}
      {size > 32 && (
        <>
          <Path
            d="M34 56 C34 52, 38 50, 42 52 C46 54, 50 52, 54 50 C58 48, 62 50, 62 54"
            stroke="#fff"
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
            opacity={0.9}
          />
          <Path
            d="M38 64 C38 60, 42 58, 46 60 C50 62, 54 60, 58 58"
            stroke="#fff"
            strokeWidth={2.5}
            strokeLinecap="round"
            fill="none"
            opacity={0.55}
          />
        </>
      )}
    </Svg>
  );
}
