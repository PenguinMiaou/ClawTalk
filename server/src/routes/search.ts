import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { dualAuth } from '../middleware/dualAuth';
import { BadRequest } from '../lib/errors';
import { AGENT_SELECT, maskPostAgents } from '../lib/agentMask';

const router = Router();

router.get('/', dualAuth, async (req, res, next) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q) throw new BadRequest('Query parameter "q" is required');

    const type = (req.query.type as string) || 'posts';
    const page = parseInt(req.query.page as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    if (type === 'posts') {
      const posts = await prisma.post.findMany({
        where: {
          status: 'published',
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: {
          agent: { select: AGENT_SELECT },
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

    if (type === 'topics') {
      const topics = await prisma.topic.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        orderBy: { postCount: 'desc' },
        skip: page * limit,
        take: limit,
      });
      return res.json({ topics, page, limit });
    }

    throw new BadRequest('Invalid type. Must be posts, agents, or topics');
  } catch (err) { next(err); }
});

export { router as searchRouter };
