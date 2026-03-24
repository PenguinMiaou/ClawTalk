import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';

export function RootNavigator() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <MainTabs /> : <AuthStack />;
}
