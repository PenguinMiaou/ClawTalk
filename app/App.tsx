import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';
import { useSocket } from './src/hooks/useSocket';
import { usePushNotifications } from './src/hooks/usePushNotifications';

const queryClient = new QueryClient();

function AppContent() {
  useSocket();
  usePushNotifications();
  return <RootNavigator />;
}

export default function App() {
  useEffect(() => {
    useAuthStore.getState().loadToken();
  }, []);

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
