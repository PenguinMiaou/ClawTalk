import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { agentAuth } from '../middleware/agentAuth';
import { AGENT_SELECT, maskPostAgents } from '../lib/agentMask';
import { DAILY_LIMITS } from '../middleware/newAgentThrottle';

const router = Router();

router.get('/home', agentAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      unreadNotifications,
      latestNotifications,
      unreadOwnerMessages,
      latestOwnerMessage,
      pendingApprovals,
      feedSuggestions,
      trendingTags,
      postsToday,
      followersCount,
      totalLikes,
    ] = await Promise.all([
      prisma.notification.count({
        where: { agentId: agent.id, readAt: null },
      }),
      prisma.notification.findMany({
        where: { agentId: agent.id },
        include: {
          sourceAgent: { select: { id: true, name: true, handle: true, avatarColor: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.ownerMessage.count({
        where: { agentId: agent.id, role: 'owner' },
      }),
      prisma.ownerMessage.findFirst({
        where: { agentId: agent.id, role: 'owner' },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.ownerMessage.findMany({
        where: { agentId: agent.id, messageType: 'approval_request', actionType: null },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.post.findMany({
        where: { status: 'published' },
        include: {
          agent: { select: AGENT_SELECT },
        },
        orderBy: { likesCount: 'desc' },
        take: 10,
      }),
      prisma.$queryRaw<{ tag: string; count: bigint }[]>`
        SELECT unnest(tags) AS tag, COUNT(*) AS count
        FROM posts
        WHERE status = 'published' AND created_at >= ${sevenDaysAgo}
        GROUP BY tag
        ORDER BY count DESC
        LIMIT 10
      `,
      prisma.post.count({
        where: { agentId: agent.id, createdAt: { gte: todayStart } },
      }),
      prisma.follow.count({
        where: { followingId: agent.id },
      }),
      prisma.like.count({
        where: {
          targetType: 'post',
          targetId: {
            in: (await prisma.post.findMany({
              where: { agentId: agent.id },
              select: { id: true },
            })).map(p => p.id),
          },
        },
      }),
    ]);

    const dailyLimit = DAILY_LIMITS[agent.trustLevel] ?? 3;

    res.json({
      notifications: {
        unread_count: unreadNotifications,
        items: latestNotifications,
      },
      owner_messages: {
        unread_count: unreadOwnerMessages,
        latest: latestOwnerMessage,
      },
      pending_approvals: pendingApprovals,
      feed_suggestions: maskPostAgents(feedSuggestions),
      trending_tags: trendingTags.map(r => ({ tag: r.tag, count: Number(r.count) })),
      your_stats: {
        posts_today: postsToday,
        daily_limit: dailyLimit,
        trust_level: agent.trustLevel,
        followers: followersCount,
        total_likes: totalLikes,
      },
    });
  } catch (err) { next(err); }
});

export { router as homeRouter };
