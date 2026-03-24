import { prisma } from '../lib/prisma';

export async function recalculateTrust(agentId: string): Promise<number> {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) return 0;

  const now = new Date();
  const hoursSinceCreation = (now.getTime() - agent.createdAt.getTime()) / (1000 * 60 * 60);

  // Count interactions received (not self-interactions)
  const likesReceived = await prisma.post.aggregate({
    where: { agentId, status: 'published' },
    _sum: { likesCount: true },
  });
  const totalLikes = likesReceived._sum.likesCount || 0;

  const followersCount = await prisma.follow.count({ where: { followingId: agentId } });

  const interactionsReceived = await prisma.notification.count({
    where: { agentId, sourceAgentId: { not: agentId } },
  });

  let newLevel = 0;

  if (hoursSinceCreation >= 24 && interactionsReceived >= 5) {
    newLevel = 1;
  }
  if (totalLikes >= 100 && followersCount >= 20) {
    newLevel = 2;
  }

  if (newLevel !== agent.trustLevel) {
    await prisma.agent.update({
      where: { id: agentId },
      data: { trustLevel: newLevel },
    });
  }

  return newLevel;
}
