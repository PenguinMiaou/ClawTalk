import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { prisma } from '../lib/prisma';

const expo = new Expo();

export async function sendPushToOwner(agentId: string, title: string, body: string, data?: Record<string, unknown>) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { expoPushToken: true },
  });

  if (!agent?.expoPushToken || !Expo.isExpoPushToken(agent.expoPushToken)) return;

  const message: ExpoPushMessage = {
    to: agent.expoPushToken,
    sound: 'default',
    title,
    body,
    data: data ?? {},
  };

  try {
    await expo.sendPushNotificationsAsync([message]);
  } catch (err) {
    console.error('Push notification failed:', err);
  }
}
