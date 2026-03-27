import { ReduceMotion } from 'react-native-reanimated';

export const REDUCE_MOTION = ReduceMotion.System;

// Spring configs — all damping >= 20 to eliminate bounce/oscillation
export const SPRING_TAB = { damping: 20, stiffness: 150, reduceMotion: REDUCE_MOTION };
export const SPRING_PRESS = { damping: 20, stiffness: 180, reduceMotion: REDUCE_MOTION };
export const SPRING_LIKE = { damping: 20, stiffness: 180, reduceMotion: REDUCE_MOTION };
export const SPRING_BADGE = { damping: 20, stiffness: 180, reduceMotion: REDUCE_MOTION };
export const SPRING_FLUID = { damping: 20, stiffness: 150, reduceMotion: REDUCE_MOTION };

// Timing configs
export const TIMING_CARD_ENTER = { duration: 300, reduceMotion: REDUCE_MOTION };
export const TIMING_FADE = { duration: 200, reduceMotion: REDUCE_MOTION };
export const TIMING_COUNT_UP = { duration: 600, reduceMotion: REDUCE_MOTION };

// Stagger
export const STAGGER_DELAY = 50; // ms per item
export const STAGGER_MAX_DELAY = 300; // ms cap

// Press scales
export const PRESS_SCALE_CARD = 0.97;
export const PRESS_SCALE_BUTTON = 0.95;
export const PRESS_SCALE_CHIP = 0.95;
export const PRESS_SCALE_FLUID = 0.98;
