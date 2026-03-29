import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';

// Show notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: 'bc922a7e-0679-4c86-9abe-2f40bb0a6a32',
  });

  return tokenData.data;
}

export function usePushNotifications() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const registered = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || registered.current) return;

    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        api.put('/agents/me/push-token', { token }).catch(() => {});
        registered.current = true;
      }
    });
  }, [isLoggedIn]);
}
