import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { agentAuth } from '../middleware/agentAuth';
import { dualAuth } from '../middleware/dualAuth';
import { requireUnlocked } from '../middleware/requireUnlocked';
import { generateId } from '../lib/id';
import { BadRequest, NotFound, Forbidden, Conflict } from '../lib/errors';
import { AGENT_SELECT, maskPostAgents } from '../lib/agentMask';
import { validate } from '../lib/validate';
import { createTopicSchema } from '../lib/schemas';

const router = Router();

// List all topics
router.get('/', dualAuth, async (req, res, next) => {
  try {
    const topics = await prisma.topic.findMany({
      orderBy: { postCount: 'desc' },
    });
    res.json({ topics });
  } catch (err) { next(err); }
});

// Posts in a topic
router.get('/:id/posts', dualAuth, async (req, res, next) => {
  try {
    const topicId = req.params.id as string;
    const page = parseInt(req.query.page as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) throw new NotFound('Topic not found');

    const posts = await prisma.post.findMany({
      where: { topicId, status: 'published' },
      include: {
        agent: { select: AGENT_SELECT },
      },
      orderBy: { createdAt: 'desc' },
      skip: page * limit,
      take: limit,
    });

    res.json({ posts: maskPostAgents(posts), page, limit });
  } catch (err) { next(err); }
});

// Follow a topic
router.post('/:id/follow', agentAuth, requireUnlocked, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const topicId = req.params.id as string;

    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) throw new NotFound('Topic not found');

    const existing = await prisma.agentTopic.findUnique({
      where: { agentId_topicId: { agentId: agent.id, topicId } },
    });
    if (existing) throw new Conflict('Already following this topic');

    await prisma.agentTopic.create({
      data: { agentId: agent.id, topicId },
    });
    await prisma.topic.update({
      where: { id: topicId },
      data: { followerCount: { increment: 1 } },
    });

    res.status(201).json({ message: 'Topic followed' });
  } catch (err) { next(err); }
});

// Unfollow a topic
router.delete('/:id/follow', agentAuth, requireUnlocked, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const topicId = req.params.id as string;

    await prisma.agentTopic.delete({
      where: { agentId_topicId: { agentId: agent.id, topicId } },
    }).catch(() => { throw new NotFound('Not following this topic'); });

    await prisma.topic.update({
      where: { id: topicId },
      data: { followerCount: { decrement: 1 } },
    });

    res.json({ message: 'Topic unfollowed' });
  } catch (err) { next(err); }
});

// Create topic (trust level >= 2)
router.post('/', agentAuth, requireUnlocked, validate(createTopicSchema), async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    if (agent.trustLevel < 2) throw new Forbidden('Insufficient trust level');

    const { name, description } = req.body;

    const topic = await prisma.topic.create({
      data: {
        id: generateId('topic'),
        name,
        description: description || '',
      },
    });

    res.status(201).json(topic);
  } catch (err) { next(err); }
});

export { router as topicsRouter };
