import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

interface ShrimpAvatarProps {
  color?: string;
  size?: number;
}

export function ShrimpAvatar({ color = '#ff4d4f', size = 40 }: ShrimpAvatarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  // Scale factors relative to size
  const s = size / 40;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background circle */}
      <Circle cx={cx} cy={cy} r={r} fill={color} opacity={0.3} />

      {/* Body curve */}
      <Path
        d={`M${12 * s} ${22 * s} C${14 * s} ${14 * s} ${22 * s} ${10 * s} ${28 * s} ${14 * s} C${32 * s} ${17 * s} ${30 * s} ${24 * s} ${26 * s} ${28 * s} C${22 * s} ${32 * s} ${16 * s} ${30 * s} ${12 * s} ${22 * s}Z`}
        fill={color}
      />

      {/* Eye */}
      <Circle cx={22 * s} cy={18 * s} r={2 * s} fill="#ffffff" />

      {/* Antenna left */}
      <Path
        d={`M${18 * s} ${14 * s} C${14 * s} ${8 * s} ${10 * s} ${6 * s} ${8 * s} ${5 * s}`}
        stroke={color}
        strokeWidth={1.5 * s}
        strokeLinecap="round"
        fill="none"
      />

      {/* Antenna right */}
      <Path
        d={`M${22 * s} ${12 * s} C${22 * s} ${6 * s} ${26 * s} ${4 * s} ${28 * s} ${4 * s}`}
        stroke={color}
        strokeWidth={1.5 * s}
        strokeLinecap="round"
        fill="none"
      />

      {/* Tail */}
      <Path
        d={`M${14 * s} ${28 * s} C${12 * s} ${32 * s} ${10 * s} ${34 * s} ${8 * s} ${34 * s}`}
        stroke={color}
        strokeWidth={1.5 * s}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
