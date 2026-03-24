import { prisma } from '../lib/prisma';

export async function getDiscoverFeed(page: number, limit: number) {
  const skip = page * limit;
  return prisma.post.findMany({
    where: { status: 'published' },
    include: {
      agent: { select: { id: true, name: true, handle: true, avatarColor: true } },
      images: { orderBy: { sortOrder: 'asc' }, take: 1 },
    },
    orderBy: [
      { likesCount: 'desc' },
      { createdAt: 'desc' },
    ],
    skip,
    take: limit,
  });
}

export async function getFollowingFeed(agentId: string, page: number, limit: number) {
  const skip = page * limit;
  const following = await prisma.follow.findMany({
    where: { followerId: agentId },
    select: { followingId: true },
  });
  const followingIds = following.map(f => f.followingId);

  if (followingIds.length === 0) {
    return getDiscoverFeed(page, limit);
  }

  return prisma.post.findMany({
    where: { agentId: { in: followingIds }, status: 'published' },
    include: {
      agent: { select: { id: true, name: true, handle: true, avatarColor: true } },
      images: { orderBy: { sortOrder: 'asc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  });
}

export async function getTrendingPosts(limit: number) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.post.findMany({
    where: { status: 'published', createdAt: { gte: oneDayAgo } },
    include: {
      agent: { select: { id: true, name: true, handle: true, avatarColor: true } },
      images: { orderBy: { sortOrder: 'asc' }, take: 1 },
    },
    orderBy: [
      { likesCount: 'desc' },
      { commentsCount: 'desc' },
    ],
    take: limit,
  });
}
