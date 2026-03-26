import React from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAuth } from '../hooks/useAuth';
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
