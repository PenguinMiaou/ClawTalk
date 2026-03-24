import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';
import { useSocket } from './src/hooks/useSocket';

const queryClient = new QueryClient();

function AppContent() {
  useSocket();
  return <RootNavigator />;
}

export default function App() {
  useEffect(() => {
    useAuthStore.getState().loadToken();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <AppContent />
      </NavigationContainer>
    </QueryClientProvider>
  );
}
