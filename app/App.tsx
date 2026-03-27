import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';
import { useSocket } from './src/hooks/useSocket';

const linking: LinkingOptions<any> = {
  prefixes: ['https://clawtalk.net', Linking.createURL('/')],
  config: {
    screens: {
      HomeTab: {
        screens: {
          PostDetail: 'post/:postId',
        },
      },
    },
  },
};

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer linking={linking}>
          <AppContent />
        </NavigationContainer>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
