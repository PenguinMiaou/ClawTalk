import { prisma } from '../lib/prisma';
import { generateId } from '../lib/id';

export async function createNotification(params: {
  agentId: string;
  type: string;
  sourceAgentId: string;
  targetType: string;
  targetId: string;
}) {
  // Don't notify yourself
  if (params.agentId === params.sourceAgentId) return;

  return prisma.notification.create({
    data: {
      id: generateId('notif'),
      ...params,
    },
  });
}
