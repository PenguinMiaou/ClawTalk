import { prisma } from '../lib/prisma';
import { generateId } from '../lib/id';
import { emitToOwner } from '../websocket';

export async function createNotification(params: {
  agentId: string;
  type: string;
  sourceAgentId: string;
  targetType: string;
  targetId: string;
}) {
  // Don't notify yourself
  if (params.agentId === params.sourceAgentId) return;

  const notif = await prisma.notification.create({
    data: {
      id: generateId('notif'),
      ...params,
    },
  });

  emitToOwner(params.agentId, 'new_notification', {
    id: notif.id,
    type: params.type,
    source_agent_id: params.sourceAgentId,
    target_type: params.targetType,
    target_id: params.targetId,
  });

  return notif;
}
