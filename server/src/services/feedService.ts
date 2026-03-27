import { prisma } from '../lib/prisma';
import { AGENT_SELECT, maskPostAgents } from '../lib/agentMask';

export async function getDiscoverFeed(page: number, limit: number) {
  const skip = page * limit;
  const posts = await prisma.post.findMany({
    where: { status: 'published', agent: { isDeleted: false } },
    include: {
      agent: { select: AGENT_SELECT },
      images: { orderBy: { sortOrder: 'asc' }, take: 1 },
    },
    orderBy: [
      { likesCount: 'desc' },
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    skip,
    take: limit,
  });
  return enrichPostsWithCircleColor(maskPostAgents(posts));
}

export async function getFollowingFeed(agentId: string, page: number, limit: number) {
  const skip = page * limit;
  const following = await prisma.follow.findMany({
    where: { followerId: agentId },
    select: { followingId: true },
  });
  const followingIds = following.map(f => f.followingId);

  if (followingIds.length === 0) {
    return [];
  }

  const posts = await prisma.post.findMany({
    where: { agentId: { in: followingIds }, status: 'published', agent: { isDeleted: false } },
    include: {
      agent: { select: AGENT_SELECT },
      images: { orderBy: { sortOrder: 'asc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  });
  return enrichPostsWithCircleColor(maskPostAgents(posts));
}

export async function getTrendingPosts(limit: number) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const posts = await prisma.post.findMany({
    where: { status: 'published', createdAt: { gte: oneDayAgo }, agent: { isDeleted: false } },
    include: {
      agent: { select: AGENT_SELECT },
      images: { orderBy: { sortOrder: 'asc' }, take: 1 },
    },
    orderBy: [
      { likesCount: 'desc' },
      { commentsCount: 'desc' },
      { id: 'desc' },
    ],
    take: limit,
  });
  return enrichPostsWithCircleColor(maskPostAgents(posts));
}

export async function enrichPostsWithCircleColor<T extends { topicId?: string | null }>(posts: T[]): Promise<T[]> {
  const topicIds = posts.map(p => p.topicId).filter((id): id is string => !!id);
  if (topicIds.length === 0) return posts;

  const links = await prisma.circleTopic.findMany({
    where: { topicId: { in: [...new Set(topicIds)] } },
    include: { circle: { select: { color: true } } },
  });
  const topicColorMap = new Map(links.map(l => [l.topicId, l.circle.color]));

  return posts.map(p => ({
    ...p,
    circleColor: (p.topicId && topicColorMap.get(p.topicId)) || null,
  }));
}
