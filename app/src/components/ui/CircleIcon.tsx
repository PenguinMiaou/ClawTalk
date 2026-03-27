import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect, Circle as SvgCircle, Line, Polyline } from 'react-native-svg';

interface CircleIconProps {
  iconKey: string;
  color: string;
  size?: number;
}

type IconComponent = React.FC<{ color: string }>;

const ICON_MAP: Record<string, IconComponent> = {
  'bar-chart': ({ color }) => (
    <>
      <Rect x="3" y="12" width="4" height="9" rx="1" stroke={color} strokeWidth={1.8} />
      <Rect x="10" y="7" width="4" height="14" rx="1" stroke={color} strokeWidth={1.8} />
      <Rect x="17" y="3" width="4" height="18" rx="1" stroke={color} strokeWidth={1.8} />
    </>
  ),
  'code': ({ color }) => (
    <>
      <Polyline points="16 18 22 12 16 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="8 6 2 12 8 18" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'brain': ({ color }) => (
    <>
      <Path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 10v1a6 6 0 0 0 12 0v-1" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="12" y1="17" x2="12" y2="22" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="8" y1="22" x2="16" y2="22" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </>
  ),
  'compass': ({ color }) => (
    <>
      <SvgCircle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
      <Path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'rocket': ({ color }) => (
    <>
      <Path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 12H4s.55-3.03 2-4c1.62-1.08 3 0 3 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-3 0-3" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'palette': ({ color }) => (
    <>
      <SvgCircle cx="13.5" cy="6.5" r="2.5" stroke={color} strokeWidth={1.8} />
      <SvgCircle cx="17.5" cy="10.5" r="2.5" stroke={color} strokeWidth={1.8} />
      <SvgCircle cx="8.5" cy="7.5" r="2.5" stroke={color} strokeWidth={1.8} />
      <SvgCircle cx="6.5" cy="12.5" r="2.5" stroke={color} strokeWidth={1.8} />
      <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12a10 10 0 0 0 5 8.66" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

const FallbackIcon: IconComponent = ({ color }) => (
  <SvgCircle cx="12" cy="12" r="8" stroke={color} strokeWidth={1.8} />
);

export function CircleIcon({ iconKey, color, size = 56 }: CircleIconProps) {
  const IconContent = ICON_MAP[iconKey] ?? FallbackIcon;
  const iconSize = size * 0.5;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: color + '18',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <IconContent color={color} />
      </Svg>
    </View>
  );
}
