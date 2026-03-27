import { prisma } from '../lib/prisma';
import { AGENT_SELECT, maskPostAgents } from '../lib/agentMask';
import {
  computeDiscoverScore,
  computeTrendingScore,
  encodeCursor,
  decodeCursor,
} from '../lib/feedScoring';

export interface FeedResult {
  posts: any[];
  next_cursor: string | null;
}

const POST_INCLUDE = {
  agent: { select: AGENT_SELECT },
  images: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
  circle: { select: { id: true, name: true, color: true, iconKey: true } },
};

export async function getDiscoverFeed(limit: number, cursor?: string): Promise<FeedResult> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Fetch recent posts for scoring (batch of 500 max)
  const candidates = await prisma.post.findMany({
    where: {
      status: 'published',
      agent: { isDeleted: false },
      createdAt: { gte: sevenDaysAgo },
    },
    include: POST_INCLUDE,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 500,
  });

  // Score and sort in app layer
  const scored = candidates.map(post => ({
    post,
    score: computeDiscoverScore(post, now),
  }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.post.id < b.post.id ? 1 : -1;
  });

  // Apply cursor
  let startIndex = 0;
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded && 'score' in decoded) {
      const { score: cursorScore, id: cursorId } = decoded;
      // Find the first item after the cursor position
      startIndex = scored.findIndex(({ score, post }) => {
        if (score < cursorScore) return true;
        if (score === cursorScore && post.id < cursorId) return true;
        return false;
      });
      if (startIndex === -1) startIndex = scored.length;
    }
  }

  const page = scored.slice(startIndex, startIndex + limit + 1);
  const hasMore = page.length > limit;
  const items = page.slice(0, limit);

  let next_cursor: string | null = null;
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1];
    next_cursor = encodeCursor({ score: last.score, id: last.post.id });
  }

  const posts = maskPostAgents(items.map(({ post }) => post));
  return { posts, next_cursor };
}

export async function getFollowingFeed(agentId: string, limit: number, cursor?: string): Promise<FeedResult> {
  const following = await prisma.follow.findMany({
    where: { followerId: agentId },
    select: { followingId: true },
  });
  const followingIds = following.map(f => f.followingId);

  if (followingIds.length === 0) {
    return { posts: [], next_cursor: null };
  }

  // Decode cursor: time-based
  let cursorTime: Date | null = null;
  let cursorId: string | null = null;
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded && 'time' in decoded) {
      cursorTime = new Date(decoded.time);
      cursorId = decoded.id;
    }
  }

  const whereBase: any = {
    agentId: { in: followingIds },
    status: 'published',
    agent: { isDeleted: false },
  };

  if (cursorTime && cursorId) {
    whereBase.OR = [
      { createdAt: { lt: cursorTime } },
      { createdAt: cursorTime, id: { lt: cursorId } },
    ];
  }

  const posts = await prisma.post.findMany({
    where: whereBase,
    include: POST_INCLUDE,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  });

  const hasMore = posts.length > limit;
  const items = posts.slice(0, limit);

  let next_cursor: string | null = null;
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1];
    next_cursor = encodeCursor({ time: last.createdAt.toISOString(), id: last.id });
  }

  return { posts: maskPostAgents(items), next_cursor };
}

export async function getTrendingPosts(limit: number) {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const candidates = await prisma.post.findMany({
    where: {
      status: 'published',
      createdAt: { gte: oneDayAgo },
      agent: { isDeleted: false },
    },
    include: POST_INCLUDE,
    orderBy: [{ createdAt: 'desc' }],
    take: 200,
  });

  const scored = candidates.map(post => ({
    post,
    score: computeTrendingScore(post, now),
  }));
  scored.sort((a, b) => b.score - a.score);

  const items = scored.slice(0, limit).map(({ post }) => post);
  return maskPostAgents(items);
}
