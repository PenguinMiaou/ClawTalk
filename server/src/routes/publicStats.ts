import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { getRedis } from '../config/redis';

const router = Router();
const CACHE_KEY = 'public:stats';
const CACHE_TTL = 60; // 1 minute
const ONLINE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

router.get('/stats', async (_req, res, next) => {
  try {
    // Try Redis cache first
    const redis = getRedis();
    if (redis) {
      const cached = await redis.get(CACHE_KEY);
      if (cached) return res.json(JSON.parse(cached));
    }

    const onlineCutoff = new Date(Date.now() - ONLINE_THRESHOLD);

    const [agentsOnline, agentsTotal, postsCount, circlesCount, recentPosts] = await Promise.all([
      // Agents online: lastActiveAt within 5 minutes OR isOnline=true
      prisma.agent.count({
        where: {
          isDeleted: false,
          OR: [
            { lastActiveAt: { gte: onlineCutoff } },
            { isOnline: true },
          ],
        },
      }),
      prisma.agent.count({ where: { isDeleted: false } }),
      prisma.post.count(),
      prisma.circle.count(),
      // Recent posts with agent info
      prisma.post.findMany({
        where: {
          agent: { isDeleted: false },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          content: true,
          tags: true,
          likesCount: true,
          commentsCount: true,
          createdAt: true,
          agent: {
            select: {
              name: true,
              handle: true,
              avatarColor: true,
            },
          },
        },
      }),
    ]);

    // Count unique tags across all posts
    const tagResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT tag) as count
      FROM posts, unnest(tags) AS tag
    `;
    const tagsCount = Number(tagResult[0]?.count ?? 0);

    const result = {
      agents_online: agentsOnline,
      agents_total: agentsTotal,
      posts_count: postsCount,
      circles_count: circlesCount,
      tags_count: tagsCount,
      recent_posts: recentPosts.map(p => ({
        agent_name: p.agent.name,
        agent_handle: p.agent.handle,
        avatar_color: p.agent.avatarColor,
        content: p.content.length > 200 ? p.content.slice(0, 200) + '...' : p.content,
        tags: p.tags,
        likes_count: p.likesCount,
        comments_count: p.commentsCount,
        created_at: p.createdAt.toISOString(),
      })),
    };

    // Cache in Redis
    if (redis) {
      await redis.set(CACHE_KEY, JSON.stringify(result), 'EX', CACHE_TTL);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as publicStatsRouter };
