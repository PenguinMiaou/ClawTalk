import React, { useCallback, useRef } from 'react';
import { View, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  useDerivedValue,
} from 'react-native-reanimated';
import { SPRING_TAB, TIMING_FADE } from './constants';
import { colors, spacing } from '../theme';

type Tab = {
  key: string;
  label: string;
};

type Props = {
  tabs: Tab[];
  activeKey: string;
  onTabChange: (key: string) => void;
};

function AnimatedTab({ tab, isActive, onLayout, onPress }: {
  tab: Tab; isActive: boolean;
  onLayout: (e: LayoutChangeEvent) => void; onPress: () => void;
}) {
  const progress = useDerivedValue(() =>
    withTiming(isActive ? 1 : 0, TIMING_FADE)
  );
  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.textSecondary, colors.text]),
    fontWeight: isActive ? '600' : '400',
  }));
  return (
    <Pressable onLayout={onLayout} onPress={onPress} style={styles.tabItem}>
      <Animated.Text style={[styles.tabText, textStyle]}>{tab.label}</Animated.Text>
    </Pressable>
  );
}

export function AnimatedTabBar({ tabs, activeKey, onTabChange }: Props) {
  const activeIndex = tabs.findIndex((t) => t.key === activeKey);
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const [tabLayouts, setTabLayouts] = React.useState<{ x: number; width: number }[]>([]);
  const measuredSV = useSharedValue(0);
  const hasMeasuredRef = useRef(false);

  const handleTabLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      setTabLayouts((prev) => {
        const next = [...prev];
        next[index] = { x, width };
        if (next.filter(Boolean).length === tabs.length && !hasMeasuredRef.current) {
          hasMeasuredRef.current = true;
          measuredSV.value = 1;
          const target = next[activeIndex] || next[0];
          if (target) {
            const centerX = target.x + (target.width - 20) / 2;
            indicatorX.value = centerX;
            indicatorWidth.value = 20;
          }
        }
        return next;
      });
    },
    [tabs.length, activeIndex]
  );

  React.useEffect(() => {
    if (!hasMeasuredRef.current || !tabLayouts[activeIndex]) return;
    const target = tabLayouts[activeIndex];
    const centerX = target.x + (target.width - 20) / 2;
    indicatorX.value = withSpring(centerX, SPRING_TAB);
  }, [activeIndex, tabLayouts]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
    opacity: measuredSV.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {tabs.map((tab, index) => (
          <AnimatedTab
            key={tab.key}
            tab={tab}
            isActive={tab.key === activeKey}
            onLayout={(e) => handleTabLayout(index, e)}
            onPress={() => onTabChange(tab.key)}
          />
        ))}
      </View>
      <Animated.View style={[styles.indicator, indicatorStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tabItem: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  tabText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});
