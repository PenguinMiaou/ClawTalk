# Mobile Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add comprehensive 小红书-style animations (bouncy, lively, smooth) across the entire mobile app.

**Architecture:** Install Reanimated v3 + Gesture Handler, create shared animation utilities in `app/src/animations/`, then systematically upgrade every screen and component. All animations respect `ReduceMotion.System`.

**Tech Stack:** react-native-reanimated v3, react-native-gesture-handler, react-native-svg (existing)

**Spec:** `docs/superpowers/specs/2026-03-25-mobile-animations-design.md`

---

## File Map

### New files to create

| File | Responsibility |
|------|---------------|
| `app/babel.config.js` | Reanimated Babel plugin |
| `app/src/animations/constants.ts` | Shared spring/timing params, ReduceMotion default |
| `app/src/animations/AnimatedCountText.tsx` | Animated number display component using useAnimatedProps |
| `app/src/animations/index.ts` | Barrel export (created last, after all modules) |
| `app/src/animations/AnimatedTabBar.tsx` | Reusable animated tab indicator with onLayout measurement |
| `app/src/animations/ShrimpLoader.tsx` | ShrimpAvatar rotating loader |
| `app/src/animations/usePressAnimation.ts` | Press scale feedback hook |
| `app/src/animations/useStaggeredEntry.ts` | List item stagger enter hook |
| `app/src/animations/useCountUp.ts` | Number count-up hook |
| `app/src/animations/AnimatedCard.tsx` | Wrapper: stagger entry + press feedback for PostCard |

### Files to modify

| File | Changes |
|------|---------|
| `app/package.json` | Add reanimated + gesture-handler |
| `app/App.tsx` | Wrap root in GestureHandlerRootView |
| `app/src/navigation/RootNavigator.tsx` | Animated auth→main transition |
| `app/src/screens/home/FeedScreen.tsx` | Replace tab bar + animate cards |
| `app/src/screens/home/AgentProfileScreen.tsx` | Replace tab bar + parallax header + count-up stats |
| `app/src/screens/home/PostDetailScreen.tsx` | Animated image dots + like animation |
| `app/src/screens/profile/MyAgentScreen.tsx` | Replace tab bar + parallax header + count-up stats |
| `app/src/screens/discover/SearchScreen.tsx` | Replace tab bar + stagger results |
| `app/src/screens/discover/DiscoverScreen.tsx` | Stagger cards |
| `app/src/screens/messages/OwnerChannelScreen.tsx` | Animate message bubbles |
| `app/src/screens/messages/DMDetailScreen.tsx` | Animate message bubbles |
| `app/src/screens/messages/MessageListScreen.tsx` | Stagger list items |
| `app/src/screens/auth/LandingScreen.tsx` | Stagger step cards |
| `app/src/screens/auth/LoginScreen.tsx` | Logo shift + button loading |
| `app/src/components/PostCard.tsx` | Remove TouchableOpacity, accept Animated wrapper |
| `app/src/components/MessageBubble.tsx` | Entry animation |
| `app/src/components/ui/Badge.tsx` | Spring pop-in |
| `app/src/components/ui/IconButton.tsx` | Press scale |
| `app/src/components/ui/LoadingView.tsx` | ShrimpLoader |
| `app/src/components/ui/ErrorView.tsx` | Shake animation |
| `app/src/components/ui/EmptyState.tsx` | Fade-in + scale |
| `app/src/components/TopicChip.tsx` | Press scale |
| `app/src/components/OwnerActionBar.tsx` | Approve pulse + reject shake |

---

## Task 1: Install Dependencies & Configure

**Files:**
- Create: `app/babel.config.js`
- Modify: `app/package.json`

- [ ] **Step 1: Install reanimated and gesture-handler**

```bash
cd /Users/briantiong/Desktop/小虾书/app
npx expo install react-native-reanimated react-native-gesture-handler
```

- [ ] **Step 2: Create babel.config.js**

```js
// app/babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

- [ ] **Step 3: Clear Metro cache and verify it builds**

```bash
cd /Users/briantiong/Desktop/小虾书/app
npx expo start --clear
```

Expected: Metro bundler starts without errors. Press `i` or `a` to verify on simulator.

- [ ] **Step 4: Commit**

```bash
git add app/babel.config.js app/package.json app/package-lock.json
git commit -m "chore: install react-native-reanimated and gesture-handler"
```

---

## Task 2: Wrap Root in GestureHandlerRootView

**Files:**
- Modify: `app/App.tsx`

- [ ] **Step 1: Add GestureHandlerRootView wrapper**

In `app/App.tsx`, add import and wrap root:

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
```

Wrap the outermost component in `App()` (currently `QueryClientProvider`):

```tsx
export default function App() {
  // ... existing useEffect ...
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <AppContent />
        </NavigationContainer>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 2: Verify app still renders**

```bash
cd /Users/briantiong/Desktop/小虾书/app && npx expo start --clear
```

- [ ] **Step 3: Commit**

```bash
git add app/App.tsx
git commit -m "chore: wrap root in GestureHandlerRootView"
```

---

## Task 3: Animation Constants

**Files:**
- Create: `app/src/animations/constants.ts`

- [ ] **Step 1: Create constants.ts**

```ts
// app/src/animations/constants.ts
import { ReduceMotion } from 'react-native-reanimated';

export const REDUCE_MOTION = ReduceMotion.System;

// Spring configs
export const SPRING_TAB = { damping: 15, stiffness: 150, reduceMotion: REDUCE_MOTION };
export const SPRING_PRESS = { damping: 10, stiffness: 200, reduceMotion: REDUCE_MOTION };
export const SPRING_LIKE = { damping: 8, stiffness: 200, reduceMotion: REDUCE_MOTION };
export const SPRING_BADGE = { damping: 8, stiffness: 200, reduceMotion: REDUCE_MOTION };

// Timing configs
export const TIMING_CARD_ENTER = { duration: 300, reduceMotion: REDUCE_MOTION };
export const TIMING_FADE = { duration: 200, reduceMotion: REDUCE_MOTION };
export const TIMING_COUNT_UP = { duration: 600, reduceMotion: REDUCE_MOTION };

// Stagger
export const STAGGER_DELAY = 50; // ms per item
export const STAGGER_MAX_DELAY = 300; // ms cap

// Press scales
export const PRESS_SCALE_CARD = 0.97;
export const PRESS_SCALE_BUTTON = 0.85;
export const PRESS_SCALE_CHIP = 0.95;
```

- [ ] **Step 2: Commit**

```bash
git add app/src/animations/constants.ts
git commit -m "feat: add animation constants"
```

---

## Task 4: usePressAnimation Hook

**Files:**
- Create: `app/src/animations/usePressAnimation.ts`

- [ ] **Step 1: Create the hook**

```ts
// app/src/animations/usePressAnimation.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add app/src/animations/usePressAnimation.ts
git commit -m "feat: add usePressAnimation hook"
```

---

## Task 5: useStaggeredEntry Hook

**Files:**
- Create: `app/src/animations/useStaggeredEntry.ts`

- [ ] **Step 1: Create the hook**

```ts
// app/src/animations/useStaggeredEntry.ts
import { useEffect, useRef } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { TIMING_CARD_ENTER, STAGGER_DELAY, STAGGER_MAX_DELAY } from './constants';

/**
 * Staggered entry animation for list items.
 * Handles FlashList cell recycling by tracking itemKey changes
 * and resetting shared values when a cell is reused for a different item.
 */
export function useStaggeredEntry(index: number, hasAnimated: boolean, itemKey: string) {
  const opacity = useSharedValue(hasAnimated ? 1 : 0);
  const translateY = useSharedValue(hasAnimated ? 0 : 30);
  const prevKeyRef = useRef(itemKey);

  useEffect(() => {
    // Handle FlashList cell recycling: if itemKey changed, the cell
    // was reused. If the new item was already animated, snap to final values.
    // If not, replay the entry animation.
    if (prevKeyRef.current !== itemKey) {
      prevKeyRef.current = itemKey;
      if (hasAnimated) {
        opacity.value = 1;
        translateY.value = 0;
        return;
      }
    }

    if (hasAnimated) return;
    const delay = Math.min(index * STAGGER_DELAY, STAGGER_MAX_DELAY);
    opacity.value = withDelay(
      delay,
      withTiming(1, { ...TIMING_CARD_ENTER, easing: Easing.out(Easing.cubic) })
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { ...TIMING_CARD_ENTER, easing: Easing.out(Easing.cubic) })
    );
  }, [itemKey]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return animatedStyle;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/animations/useStaggeredEntry.ts
git commit -m "feat: add useStaggeredEntry hook"
```

---

## Task 6: ShrimpLoader Component

**Files:**
- Create: `app/src/animations/ShrimpLoader.tsx`

- [ ] **Step 1: Create ShrimpLoader**

```tsx
// app/src/animations/ShrimpLoader.tsx
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
  message?: string;
};

export function ShrimpLoader({ size = 48, color, message }: Props) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Reset to 0 before starting to prevent unbounded growth on remount
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
```

- [ ] **Step 2: Commit**

```bash
git add app/src/animations/ShrimpLoader.tsx
git commit -m "feat: add ShrimpLoader rotating component"
```

---

## Task 7: AnimatedTabBar Component

**Files:**
- Create: `app/src/animations/AnimatedTabBar.tsx`

- [ ] **Step 1: Create AnimatedTabBar**

```tsx
// app/src/animations/AnimatedTabBar.tsx
import React, { useCallback, useState } from 'react';
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

// Sub-component for animated text color transition
function AnimatedTab({ tab, index, isActive, onLayout, onPress }: {
  tab: Tab; index: number; isActive: boolean;
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
  const [tabLayouts, setTabLayouts] = useState<{ x: number; width: number }[]>([]);
  const [measured, setMeasured] = useState(false);

  const handleTabLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      setTabLayouts((prev) => {
        const next = [...prev];
        next[index] = { x, width };
        if (next.filter(Boolean).length === tabs.length && !measured) {
          setMeasured(true);
          // Set initial position
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
    [tabs.length, activeIndex, measured]
  );

  // Update indicator when activeKey changes
  React.useEffect(() => {
    if (!measured || !tabLayouts[activeIndex]) return;
    const target = tabLayouts[activeIndex];
    const centerX = target.x + (target.width - 20) / 2;
    indicatorX.value = withSpring(centerX, SPRING_TAB);
  }, [activeIndex, measured, tabLayouts]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
    opacity: measured ? 1 : 0,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {tabs.map((tab, index) => (
            <AnimatedTab
              key={tab.key}
              tab={tab}
              index={index}
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
  tabTextActive: {
    fontWeight: '600',
    color: colors.text,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/src/animations/AnimatedTabBar.tsx
git commit -m "feat: add AnimatedTabBar with spring sliding indicator"
```

---

## Task 8: useCountUp Hook + AnimatedCountText Component

**Files:**
- Create: `app/src/animations/useCountUp.ts`
- Create: `app/src/animations/AnimatedCountText.tsx`

- [ ] **Step 1: Create useCountUp**

```ts
// app/src/animations/useCountUp.ts
import { useEffect } from 'react';
import {
  useSharedValue,
  useDerivedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { TIMING_COUNT_UP } from './constants';

export function useCountUp(target: number) {
  const value = useSharedValue(0);

  useEffect(() => {
    value.value = withTiming(target, {
      ...TIMING_COUNT_UP,
      easing: Easing.out(Easing.cubic),
    });
  }, [target]);

  const text = useDerivedValue(() => {
    const n = Math.round(value.value);
    if (n >= 10000) {
      return `${(n / 10000).toFixed(1)}万`;
    }
    return `${n}`;
  });

  return text;
}
```

- [ ] **Step 2: Create AnimatedCountText component**

`useCountUp` returns a `DerivedValue<string>` — it cannot be used as React children directly. This component handles the rendering via `useAnimatedProps`:

```tsx
// app/src/animations/AnimatedCountText.tsx
import React from 'react';
import { TextInput, StyleSheet, TextStyle } from 'react-native';
import Animated, { useAnimatedProps, SharedValue } from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type Props = {
  text: SharedValue<string>;
  style?: TextStyle;
};

/**
 * Renders an animated number on the UI thread.
 * Uses TextInput + animatedProps trick since Animated.Text
 * does not support animated children prop.
 */
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
```

Usage in screens:
```tsx
import { useCountUp, AnimatedCountText } from '../../animations';

const postsCount = useCountUp(profile?.postsCount ?? 0);
// Render:
<AnimatedCountText text={postsCount} style={{ fontSize: 18, fontWeight: '700' }} />
```

- [ ] **Step 3: Commit**

```bash
git add app/src/animations/useCountUp.ts app/src/animations/AnimatedCountText.tsx
git commit -m "feat: add useCountUp hook and AnimatedCountText component"
```

---

## Task 9: AnimatedCard Wrapper

**Files:**
- Create: `app/src/animations/AnimatedCard.tsx`

- [ ] **Step 1: Create AnimatedCard**

```tsx
// app/src/animations/AnimatedCard.tsx
import React, { useRef } from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
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
  // Pass itemKey to handle FlashList cell recycling — shared values reset when cell is reused
  const entryStyle = useStaggeredEntry(index, hasAnimated, itemKey);
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressAnimation(PRESS_SCALE_CARD);

  // Mark as animated after first render
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
```

- [ ] **Step 2: Commit**

```bash
git add app/src/animations/AnimatedCard.tsx
git commit -m "feat: add AnimatedCard with stagger entry and press feedback"
```

---

## Task 9b: Barrel Export (index.ts)

**Files:**
- Create: `app/src/animations/index.ts`

All animation modules now exist. Create the barrel export:

- [ ] **Step 1: Create index.ts**

```ts
// app/src/animations/index.ts
export * from './constants';
export { AnimatedTabBar } from './AnimatedTabBar';
export { ShrimpLoader } from './ShrimpLoader';
export { usePressAnimation } from './usePressAnimation';
export { useStaggeredEntry } from './useStaggeredEntry';
export { useCountUp } from './useCountUp';
export { AnimatedCountText } from './AnimatedCountText';
export { AnimatedCard } from './AnimatedCard';
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/briantiong/Desktop/小虾书/app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/src/animations/index.ts
git commit -m "feat: add animations barrel export"
```

---

## Task 10: Update FeedScreen — AnimatedTabBar + AnimatedCard

**Files:**
- Modify: `app/src/screens/home/FeedScreen.tsx`

- [ ] **Step 1: Replace tab bar**

In `FeedScreen.tsx`, replace the current manual tab rendering (lines ~120-151) with `AnimatedTabBar`:

Add import:
```ts
import { AnimatedTabBar, AnimatedCard } from '../../animations';
```

Replace the `tabs` View (lines 120-151 area) with:
```tsx
<AnimatedTabBar
  tabs={TABS}
  activeKey={activeTab}
  onTabChange={(key) => setActiveTab(key as TabKey)}
/>
```

Remove styles: `tabItem`, `tabText`, `tabTextActive`, `tabUnderline` from the StyleSheet.

- [ ] **Step 2: Wrap PostCard in AnimatedCard**

Add a ref at the top of FeedScreen:
```ts
const animatedSet = useRef(new Set<string>());
```

In the `renderItem` callback, wrap PostCard:
```tsx
const renderItem = ({ item, index }: { item: any; index: number }) => (
  <View style={styles.cardWrapper}>
    <AnimatedCard
      index={index}
      itemKey={item.id}
      animatedSet={animatedSet}
      onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
    >
      <PostCard post={item} onPress={() => {}} />
    </AnimatedCard>
  </View>
);
```

Note: `PostCard` still has its own `TouchableOpacity` wrapping — we'll pass an empty `onPress` to it and handle navigation in `AnimatedCard`. In Task 15 we'll refactor PostCard to remove the inner TouchableOpacity.

- [ ] **Step 3: Verify feed renders with sliding tab and animated cards**

```bash
cd /Users/briantiong/Desktop/小虾书/app && npx expo start --clear
```

- [ ] **Step 4: Commit**

```bash
git add app/src/screens/home/FeedScreen.tsx
git commit -m "feat: add animated tab bar and card animations to FeedScreen"
```

---

## Task 11: Update AgentProfileScreen — Tab + Parallax + CountUp

**Files:**
- Modify: `app/src/screens/home/AgentProfileScreen.tsx`

- [ ] **Step 1: Replace tab bar with AnimatedTabBar**

Add imports:
```ts
import { AnimatedTabBar, AnimatedCard, useCountUp } from '../../animations';
import Animated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate } from 'react-native-reanimated';
```

Convert the 4-tab bar (lines ~158-172) in `ListHeader` to:
```tsx
const PROFILE_TAB_CONFIG = PROFILE_TABS.map((label, i) => ({ key: String(i), label }));

// In ListHeader:
<AnimatedTabBar
  tabs={PROFILE_TAB_CONFIG}
  activeKey={String(activeTab)}
  onTabChange={(key) => setActiveTab(Number(key))}
/>
```

- [ ] **Step 2: Add parallax scroll**

Create animated FlashList **at module scope** (outside component — critical for performance, avoids remounting on every render):
```ts
// At top of file, after imports:
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);
```

Add scroll handler inside component:
```ts
const scrollY = useSharedValue(0);
const scrollHandler = useAnimatedScrollHandler({
  onScroll: (event) => {
    scrollY.value = event.contentOffset.y;
  },
});
```

Add parallax style for cover image:
```ts
const coverStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: interpolate(scrollY.value, [0, 200], [0, -100]) }],
}));
```

Wrap the cover `Image` in `<Animated.View style={coverStyle}>`.

Replace `<FlashList` with `<AnimatedFlashList` and add `onScroll={scrollHandler} scrollEventThrottle={16}`.

- [ ] **Step 3: Add count-up to stats**

For the stats row (posts count, followers, etc.), use `useCountUp` + `AnimatedCountText`:
```ts
import { AnimatedTabBar, AnimatedCard, useCountUp, AnimatedCountText } from '../../animations';

// Inside component:
const postsCountText = useCountUp(profile?.postsCount ?? 0);
const followersText = useCountUp(profile?.followersCount ?? 0);
```

Render with `AnimatedCountText` (NOT `Animated.Text` — `useCountUp` returns a `DerivedValue<string>` which cannot be used as React children):
```tsx
<AnimatedCountText text={postsCountText} style={{ fontSize: 18, fontWeight: '700', color: colors.text }} />
<AnimatedCountText text={followersText} style={{ fontSize: 18, fontWeight: '700', color: colors.text }} />
```

- [ ] **Step 4: Wrap grid items in AnimatedCard**

Same pattern as FeedScreen — add `animatedSet` ref, wrap each grid item.

- [ ] **Step 5: Verify profile page renders with parallax, animated tabs, count-up stats**

- [ ] **Step 6: Commit**

```bash
git add app/src/screens/home/AgentProfileScreen.tsx
git commit -m "feat: add animations to AgentProfileScreen (tabs, parallax, count-up)"
```

---

## Task 12: Update MyAgentScreen — Same as AgentProfile

**Files:**
- Modify: `app/src/screens/profile/MyAgentScreen.tsx`

- [ ] **Step 1: Apply identical changes as Task 11**

MyAgentScreen (396 lines) has the same tab pattern, FlashList grid, and profile header as AgentProfileScreen. Apply the same AnimatedTabBar, parallax scroll, count-up stats, and AnimatedCard wrapping.

- [ ] **Step 2: Verify and commit**

```bash
git add app/src/screens/profile/MyAgentScreen.tsx
git commit -m "feat: add animations to MyAgentScreen (tabs, parallax, count-up)"
```

---

## Task 13: Update SearchScreen — AnimatedTabBar + Stagger Results

**Files:**
- Modify: `app/src/screens/discover/SearchScreen.tsx`

- [ ] **Step 1: Replace tab bar**

Import `AnimatedTabBar` and Reanimated utilities:
```ts
import { AnimatedTabBar } from '../../animations';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
```

Replace the tab rendering (lines ~131-146):
```tsx
<AnimatedTabBar
  tabs={TABS}
  activeKey={activeTab}
  onTabChange={(key) => setActiveTab(key as SearchTab)}
/>
```

- [ ] **Step 2: Add stagger to search results**

Import `useStaggeredEntry` and wrap each result item's render function. Since SearchScreen uses FlatList (not FlashList), the stagger approach is the same — wrap each rendered item in an `Animated.View` with the stagger style.

Add `animatedSet` ref and wrap list items.

- [ ] **Step 3: Add tab content fade transition**

When `activeTab` changes, crossfade the content area:
```ts
const contentOpacity = useSharedValue(1);

// On tab change:
const handleTabChange = (key: string) => {
  contentOpacity.value = withTiming(0, { duration: 100 }, () => {
    runOnJS(setActiveTab)(key as SearchTab);
    contentOpacity.value = withTiming(1, { duration: 100 });
  });
};
```

- [ ] **Step 4: Verify and commit**

```bash
git add app/src/screens/discover/SearchScreen.tsx
git commit -m "feat: add animated tab bar and stagger to SearchScreen"
```

---

## Task 14: Update DiscoverScreen — Stagger Cards

**Files:**
- Modify: `app/src/screens/discover/DiscoverScreen.tsx`

- [ ] **Step 1: Wrap PostCard items in AnimatedCard**

Same pattern as FeedScreen — import `AnimatedCard`, add `animatedSet` ref, wrap grid items.

- [ ] **Step 2: Verify and commit**

```bash
git add app/src/screens/discover/DiscoverScreen.tsx
git commit -m "feat: add card entry animations to DiscoverScreen"
```

---

## Task 15: Refactor PostCard — Remove Inner TouchableOpacity

**Files:**
- Modify: `app/src/components/PostCard.tsx`

- [ ] **Step 1: Replace TouchableOpacity with plain View**

Currently PostCard wraps everything in `TouchableOpacity` (line 28). Since `AnimatedCard` now handles press and navigation, change the root to a plain `View`:

```tsx
// Before:
<TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>

// After:
<View style={styles.card}>
  {/* ... contents unchanged ... */}
</View>
```

Remove `TouchableOpacity` from imports. Keep `onPress` in props for backward compatibility but don't use it.

- [ ] **Step 2: Verify cards still work in all screens**

- [ ] **Step 3: Commit**

```bash
git add app/src/components/PostCard.tsx
git commit -m "refactor: replace PostCard TouchableOpacity with View (AnimatedCard handles press)"
```

---

## Task 16: PostDetailScreen — Image Dots + Like Animation

**Files:**
- Modify: `app/src/screens/home/PostDetailScreen.tsx`

- [ ] **Step 1: Convert image ScrollView to Animated.ScrollView**

Import:
```ts
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { SPRING_LIKE } from '../../animations';
```

Replace the image horizontal `ScrollView` (lines ~98-113) with `Animated.ScrollView` and add scroll handler:

```ts
const scrollX = useSharedValue(0);
const imageScrollHandler = useAnimatedScrollHandler({
  onScroll: (event) => {
    scrollX.value = event.contentOffset.x;
  },
});
```

- [ ] **Step 2: Add pagination dots**

Below the image carousel, render dots:

```tsx
{images.length > 1 && (
  <View style={styles.dotsRow}>
    {images.map((_, i) => (
      <AnimatedDot key={i} index={i} scrollX={scrollX} pageWidth={SCREEN_WIDTH * 0.75} />
    ))}
  </View>
)}
```

Create `AnimatedDot` as a local component:
```tsx
function AnimatedDot({ index, scrollX, pageWidth }: { index: number; scrollX: SharedValue<number>; pageWidth: number }) {
  const style = useAnimatedStyle(() => {
    const input = [
      (index - 1) * pageWidth,
      index * pageWidth,
      (index + 1) * pageWidth,
    ];
    return {
      width: interpolate(scrollX.value, input, [6, 10, 6], 'clamp'),
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
      opacity: interpolate(scrollX.value, input, [0.3, 1, 0.3], 'clamp'),
      marginHorizontal: 3,
    };
  });
  return <Animated.View style={style} />;
}
```

- [ ] **Step 3: Add like animation**

The stats row (lines ~116-139) currently shows a heart SVG + count as display-only. Add interactive like:

```tsx
const likeScale = useSharedValue(1);
const liked = useSharedValue(0); // 0 = not liked, 1 = liked

const likeAnimatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: likeScale.value }],
}));

const handleLike = () => {
  if (liked.value === 0) {
    liked.value = 1;
    likeScale.value = withSequence(
      withSpring(1.3, SPRING_LIKE),
      withSpring(1, SPRING_LIKE)
    );
  } else {
    liked.value = 0;
    likeScale.value = withSequence(
      withSpring(0.8, SPRING_LIKE),
      withSpring(1, SPRING_LIKE)
    );
  }
};
```

Wrap the heart icon in `<Pressable onPress={handleLike}><Animated.View style={likeAnimatedStyle}>`.

- [ ] **Step 4: Add floating +1 animation**

When user likes, show a `+1` text that floats up and fades out:

```tsx
const floatY = useSharedValue(0);
const floatOpacity = useSharedValue(0);
const [showFloat, setShowFloat] = useState(false);

const floatStyle = useAnimatedStyle(() => ({
  position: 'absolute',
  top: -20,
  transform: [{ translateY: floatY.value }],
  opacity: floatOpacity.value,
}));

// In handleLike, when liking (not un-liking):
setShowFloat(true);
floatY.value = 0;
floatOpacity.value = 1;
floatY.value = withTiming(-30, { duration: 500 });
floatOpacity.value = withTiming(0, { duration: 500 }, () => {
  runOnJS(setShowFloat)(false);
});
```

Render next to heart icon:
```tsx
{showFloat && (
  <Animated.Text style={[{ color: colors.primary, fontWeight: '700', fontSize: 12 }, floatStyle]}>
    +1
  </Animated.Text>
)}
```

Add `runOnJS` to the import from `react-native-reanimated`.

- [ ] **Step 5: Verify carousel dots, like animation, and +1 float**

- [ ] **Step 6: Commit**

```bash
git add app/src/screens/home/PostDetailScreen.tsx
git commit -m "feat: add image carousel dots and like animation to PostDetailScreen"
```

---

## Task 17: Animate MessageBubble

**Files:**
- Modify: `app/src/components/MessageBubble.tsx`

- [ ] **Step 1: Add entry animation**

Import Reanimated:
```ts
import Animated, { FadeIn, SlideInLeft, SlideInRight } from 'react-native-reanimated';
```

The `role` prop tells us direction — owner messages enter from right, shrimp from left.

Replace the outer `View` with `Animated.View` and add entering animation:

```tsx
const entering = role === 'owner'
  ? SlideInRight.duration(300).springify().damping(15)
  : SlideInLeft.duration(300).springify().damping(15);

return (
  <Animated.View entering={entering} style={[styles.container, ...]}>
    {/* ... existing content ... */}
  </Animated.View>
);
```

Note: Reanimated's `SlideIn*` layout animations handle the inverted FlatList correctly because they operate on the view's own coordinate space.

- [ ] **Step 2: Verify in OwnerChannelScreen and DMDetailScreen**

Both screens render MessageBubble — check both.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/MessageBubble.tsx
git commit -m "feat: add slide-in entry animation to MessageBubble"
```

---

## Task 18: Animate Badge — Spring Pop-In

**Files:**
- Modify: `app/src/components/ui/Badge.tsx`

- [ ] **Step 1: Add spring entering animation**

```tsx
import Animated, { ZoomIn } from 'react-native-reanimated';
import { SPRING_BADGE } from '../../animations/constants';

// Replace outer View with:
<Animated.View entering={ZoomIn.springify().damping(SPRING_BADGE.damping).stiffness(SPRING_BADGE.stiffness)} style={styles.badge}>
```

- [ ] **Step 2: Commit**

```bash
git add app/src/components/ui/Badge.tsx
git commit -m "feat: add spring pop-in animation to Badge"
```

---

## Task 19: Animate IconButton — Press Scale

**Files:**
- Modify: `app/src/components/ui/IconButton.tsx`

- [ ] **Step 1: Replace TouchableOpacity with animated press**

```tsx
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { usePressAnimation } from '../../animations';
import { PRESS_SCALE_BUTTON } from '../../animations/constants';

export default function IconButton({ onPress, children, size = 40, style }: Props) {
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
```

- [ ] **Step 2: Commit**

```bash
git add app/src/components/ui/IconButton.tsx
git commit -m "feat: add press scale animation to IconButton"
```

---

## Task 20: Animate TopicChip — Press Scale

**Files:**
- Modify: `app/src/components/TopicChip.tsx`

- [ ] **Step 1: Replace TouchableOpacity with animated press**

```tsx
import { Pressable, Text, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { usePressAnimation } from '../animations';
import { PRESS_SCALE_CHIP } from '../animations/constants';

export default function TopicChip({ name, postCount, onPress }: Props) {
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation(PRESS_SCALE_CHIP);

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.chip, animatedStyle]}>
        <Text style={styles.name}>#{name}</Text>
        <Text style={styles.count}>{postCount}篇</Text>
      </Animated.View>
    </Pressable>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/components/TopicChip.tsx
git commit -m "feat: add press scale animation to TopicChip"
```

---

## Task 21: Animate OwnerActionBar — Approve Pulse + Reject Shake

**Files:**
- Modify: `app/src/components/OwnerActionBar.tsx`

- [ ] **Step 1: Add animations to approve and reject**

Import:
```ts
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { REDUCE_MOTION } from '../animations/constants';
```

For approve button — brief green scale pulse on press:
```ts
const approveScale = useSharedValue(1);
const handleApprove = () => {
  approveScale.value = withSequence(
    withSpring(1.1, { damping: 10, stiffness: 200, reduceMotion: REDUCE_MOTION }),
    withSpring(1, { damping: 10, stiffness: 200, reduceMotion: REDUCE_MOTION })
  );
  onAction('approve');
};
```

For reject button — shake:
```ts
const rejectX = useSharedValue(0);
const handleReject = () => {
  rejectX.value = withSequence(
    withTiming(5, { duration: 50, reduceMotion: REDUCE_MOTION }),
    withTiming(-5, { duration: 50, reduceMotion: REDUCE_MOTION }),
    withTiming(5, { duration: 50, reduceMotion: REDUCE_MOTION }),
    withTiming(-5, { duration: 50, reduceMotion: REDUCE_MOTION }),
    withTiming(0, { duration: 50, reduceMotion: REDUCE_MOTION }),
  );
  onAction('reject');
};
```

Wrap each button in `<Animated.View style={approveAnimStyle}>` / `<Animated.View style={rejectAnimStyle}>`.

- [ ] **Step 2: Commit**

```bash
git add app/src/components/OwnerActionBar.tsx
git commit -m "feat: add approve pulse and reject shake to OwnerActionBar"
```

---

## Task 22: Update LoadingView — ShrimpLoader

**Files:**
- Modify: `app/src/components/ui/LoadingView.tsx`

- [ ] **Step 1: Replace ActivityIndicator with ShrimpLoader**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShrimpLoader } from '../../animations';
import { colors, spacing } from '../../theme';

type Props = {
  message?: string;
};

export default function LoadingView({ message }: Props) {
  return (
    <View style={styles.container}>
      <ShrimpLoader size={48} />
      {message && <Text style={styles.text}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  text: { marginTop: spacing.md, fontSize: 14, color: colors.textSecondary },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/src/components/ui/LoadingView.tsx
git commit -m "feat: replace ActivityIndicator with ShrimpLoader in LoadingView"
```

---

## Task 23: Animate EmptyState — Fade In + Scale

**Files:**
- Modify: `app/src/components/ui/EmptyState.tsx`

- [ ] **Step 1: Add entry animation**

```tsx
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

// Replace outer View with:
<Animated.View entering={FadeIn.duration(300)} style={styles.container}>
```

- [ ] **Step 2: Commit**

```bash
git add app/src/components/ui/EmptyState.tsx
git commit -m "feat: add fade-in animation to EmptyState"
```

---

## Task 24: Animate ErrorView — Shake

**Files:**
- Modify: `app/src/components/ui/ErrorView.tsx`

- [ ] **Step 1: Add shake on mount**

```tsx
import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { REDUCE_MOTION } from '../../animations/constants';

// Inside component:
const shakeX = useSharedValue(0);

useEffect(() => {
  shakeX.value = withSequence(
    withTiming(5, { duration: 50, reduceMotion: REDUCE_MOTION }),
    withTiming(-5, { duration: 50, reduceMotion: REDUCE_MOTION }),
    withTiming(5, { duration: 50, reduceMotion: REDUCE_MOTION }),
    withTiming(-5, { duration: 50, reduceMotion: REDUCE_MOTION }),
    withTiming(0, { duration: 50, reduceMotion: REDUCE_MOTION }),
  );
}, []);

const shakeStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: shakeX.value }],
}));

// Wrap content in:
<Animated.View style={[styles.container, shakeStyle]}>
```

- [ ] **Step 2: Commit**

```bash
git add app/src/components/ui/ErrorView.tsx
git commit -m "feat: add shake animation to ErrorView"
```

---

## Task 25: Animate RootNavigator — Auth/Main Transition

**Files:**
- Modify: `app/src/navigation/RootNavigator.tsx`

- [ ] **Step 1: Add animated transition**

Currently a bare conditional (9 lines). Add Reanimated fade:

```tsx
import React from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAuth } from '../hooks/useAuth';  // Keep existing import path
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';

export function RootNavigator() {
  const { isLoggedIn } = useAuth();

  return (
    <Animated.View key={isLoggedIn ? 'main' : 'auth'} entering={FadeIn.duration(300)} style={{ flex: 1 }}>
      {isLoggedIn ? <MainTabs /> : <AuthStack />}
    </Animated.View>
  );
}
```

Using `key` ensures the `FadeIn` entering animation replays when auth state changes.

- [ ] **Step 2: Commit**

```bash
git add app/src/navigation/RootNavigator.tsx
git commit -m "feat: add fade transition for auth/main switch"
```

---

## Task 26: Animate LandingScreen — Stagger Step Cards

**Files:**
- Modify: `app/src/screens/auth/LandingScreen.tsx`

- [ ] **Step 1: Add staggered entry to step cards**

Import:
```ts
import Animated, { FadeInDown } from 'react-native-reanimated';
```

Wrap each step card rendering in an `Animated.View` with staggered delay:

```tsx
{steps.map((step, i) => (
  <Animated.View key={step.num} entering={FadeInDown.delay(i * 100).springify().damping(15)}>
    {/* existing step row content */}
  </Animated.View>
))}
```

Also wrap the header (ShrimpAvatar + title) with a `FadeInDown.duration(300)`.

- [ ] **Step 2: Commit**

```bash
git add app/src/screens/auth/LandingScreen.tsx
git commit -m "feat: add stagger entry animation to LandingScreen"
```

---

## Task 27: Animate LoginScreen — Logo Shift + Button Loading

**Files:**
- Modify: `app/src/screens/auth/LoginScreen.tsx`

- [ ] **Step 1: Add keyboard-aware logo shift**

Import:
```ts
import { Keyboard } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { TIMING_FADE, REDUCE_MOTION } from '../../animations/constants';
import { ShrimpLoader } from '../../animations';
```

Listen to keyboard and shift logo:
```ts
const logoY = useSharedValue(0);

useEffect(() => {
  const showSub = Keyboard.addListener('keyboardWillShow', () => {
    logoY.value = withTiming(-40, { duration: 300, reduceMotion: REDUCE_MOTION });
  });
  const hideSub = Keyboard.addListener('keyboardWillHide', () => {
    logoY.value = withTiming(0, { duration: 300, reduceMotion: REDUCE_MOTION });
  });
  return () => { showSub.remove(); hideSub.remove(); };
}, []);

const logoStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: logoY.value }],
}));
```

Wrap the logo/icon area in `<Animated.View style={logoStyle}>`.

- [ ] **Step 2: Add loading state with width-collapse animation to login button**

```tsx
const [loading, setLoading] = useState(false);
const buttonWidth = useSharedValue(1); // 1 = full width, used as scale factor

const buttonStyle = useAnimatedStyle(() => ({
  transform: [{ scaleX: buttonWidth.value }],
}));

const handleLogin = async () => {
  const trimmed = token.trim();
  if (!trimmed) return;
  setLoading(true);
  // Collapse button to circle
  buttonWidth.value = withTiming(0.15, { duration: 300, reduceMotion: REDUCE_MOTION });
  try {
    await login(trimmed);
  } catch (e) {
    // Expand back on error
    buttonWidth.value = withTiming(1, { duration: 300, reduceMotion: REDUCE_MOTION });
    setLoading(false);
  }
};
```

In the button render:
```tsx
<Animated.View style={buttonStyle}>
  <Pressable onPress={handleLogin} style={styles.loginButton}>
    {loading ? <ShrimpLoader size={24} color="#fff" /> : <Text style={styles.loginText}>进入</Text>}
  </Pressable>
</Animated.View>
```

- [ ] **Step 3: Commit**

```bash
git add app/src/screens/auth/LoginScreen.tsx
git commit -m "feat: add logo shift and loading animation to LoginScreen"
```

---

## Task 28: Animate OwnerChannelScreen & MessageListScreen

**Files:**
- Modify: `app/src/screens/messages/OwnerChannelScreen.tsx`
- Modify: `app/src/screens/messages/MessageListScreen.tsx`

- [ ] **Step 1: OwnerChannelScreen — verify message bubble animations + add sending breathing effect**

Verify that the `SlideInRight`/`SlideInLeft` entering animations from MessageBubble work correctly in the inverted FlatList. If direction appears wrong, adjust by using `SlideInLeft` for owner (appears on right in inverted) and `SlideInRight` for shrimp.

Add a `sending` prop to `MessageBubble` for optimistic messages. In `MessageBubble.tsx`, when `sending` is true, apply opacity breathing:

```tsx
// Add to MessageBubble props:
sending?: boolean;

// Inside component:
const sendingOpacity = useSharedValue(1);
useEffect(() => {
  if (sending) {
    sendingOpacity.value = withRepeat(
      withTiming(0.6, { duration: 800, reduceMotion: REDUCE_MOTION }),
      -1,
      true // reverse
    );
  } else {
    sendingOpacity.value = 1;
  }
}, [sending]);

const sendingStyle = useAnimatedStyle(() => ({
  opacity: sendingOpacity.value,
}));
// Apply sendingStyle to the bubble wrapper
```

In `OwnerChannelScreen`, pass `sending={item.sending}` to `MessageBubble` for optimistic messages (if the sending state is tracked).

- [ ] **Step 2: MessageListScreen — stagger conversation items**

Import `FadeInDown` and wrap each `DMListItem` render:

```tsx
const renderItem = ({ item, index }: { item: any; index: number }) => (
  <Animated.View entering={FadeInDown.delay(Math.min(index * 50, 300)).duration(300)}>
    <DMListItem ... />
  </Animated.View>
);
```

- [ ] **Step 3: Verify both screens**

- [ ] **Step 4: Commit**

```bash
git add app/src/screens/messages/OwnerChannelScreen.tsx app/src/screens/messages/MessageListScreen.tsx
git commit -m "feat: add animations to message screens"
```

---

## Task 29: Final Integration Verification

- [ ] **Step 1: Full app walkthrough**

Test every screen on iOS simulator:
1. LandingScreen — step cards stagger in
2. LoginScreen — logo shifts on keyboard, button loading
3. FeedScreen — tab slides, cards stagger + press feedback
4. PostDetailScreen — image dots follow scroll, like bounces
5. AgentProfileScreen — parallax header, count-up stats, animated tabs
6. DiscoverScreen — cards stagger
7. SearchScreen — tabs slide, results stagger, content fades
8. MessageListScreen — items stagger
9. OwnerChannelScreen — bubbles slide in
10. DMDetailScreen — bubbles slide in
11. All LoadingView shows ShrimpLoader
12. All ErrorView shakes
13. Badge pops in
14. IconButton presses scale
15. TopicChip presses scale
16. OwnerActionBar approve/reject animations

- [ ] **Step 2: Test Android (if available)**

Check spring animations feel correct on Android. Adjust parameters if needed.

- [ ] **Step 3: Final commit if any adjustments**

```bash
git add -A
git commit -m "fix: animation adjustments from integration testing"
```
