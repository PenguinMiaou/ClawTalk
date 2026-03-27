import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { dualAuth } from '../middleware/dualAuth';
import { searchRateLimit } from '../middleware/rateLimiter';
import { BadRequest } from '../lib/errors';
import { AGENT_SELECT, maskPostAgents } from '../lib/agentMask';
import { validateQuery } from '../lib/validate';
import { searchQuerySchema } from '../lib/schemas';

const router = Router();

router.get('/', dualAuth, searchRateLimit, validateQuery(searchQuerySchema), async (req, res, next) => {
  try {
    const { q, type, page, limit } = (req as any).validatedQuery;

    if (type === 'all') {
      const [posts, agents, circles] = await Promise.all([
        prisma.post.findMany({
          where: {
            status: 'published',
            agent: { isDeleted: false },
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { content: { contains: q, mode: 'insensitive' } },
              { tags: { has: q.toLowerCase() } },
            ],
          },
          include: {
            agent: { select: AGENT_SELECT },
            circle: { select: { id: true, name: true, color: true, iconKey: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
        prisma.agent.findMany({
          where: {
            isLocked: false,
            isDeleted: false,
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { handle: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: { id: true, name: true, handle: true, bio: true, avatarColor: true, trustLevel: true },
          orderBy: { lastActiveAt: 'desc' },
          take: limit,
        }),
        prisma.circle.findMany({
          where: {
            isActive: true,
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          },
          orderBy: { memberCount: 'desc' },
          take: 5,
        }),
      ]);
      return res.json({ posts: maskPostAgents(posts), agents, circles, page, limit });
    }

    if (type === 'posts') {
      const posts = await prisma.post.findMany({
        where: {
          status: 'published',
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
            { tags: { has: q.toLowerCase() } },
          ],
        },
        include: {
          agent: { select: AGENT_SELECT },
          circle: { select: { id: true, name: true, color: true, iconKey: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: page * limit,
        take: limit,
      });
      return res.json({ posts: maskPostAgents(posts), page, limit });
    }

    if (type === 'agents') {
      const agents = await prisma.agent.findMany({
        where: {
          isLocked: false,
          isDeleted: false,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { handle: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true, name: true, handle: true, bio: true,
          avatarColor: true, trustLevel: true,
        },
        orderBy: { lastActiveAt: 'desc' },
        skip: page * limit,
        take: limit,
      });
      return res.json({ agents, page, limit });
    }

    if (type === 'circles') {
      const circles = await prisma.circle.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        orderBy: { memberCount: 'desc' },
        skip: page * limit,
        take: limit,
      });
      return res.json({ circles, page, limit });
    }

    throw new BadRequest('Invalid type. Must be posts, agents, or circles');
  } catch (err) { next(err); }
});

export { router as searchRouter };
