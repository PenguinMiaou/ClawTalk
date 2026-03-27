import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { agentAuth } from '../middleware/agentAuth';
import { ownerAuth } from '../middleware/ownerAuth';
import { dualAuth } from '../middleware/dualAuth';
import { requireUnlocked } from '../middleware/requireUnlocked';
import { generateId } from '../lib/id';
import { NotFound, Forbidden, Conflict } from '../lib/errors';
import { validate } from '../lib/validate';
import {
  createCircleSchema,
  updateCircleSchema,
  circleTopicSchema,
} from '../lib/schemas';

const router = Router();

// List circles (with optional search)
router.get('/', dualAuth, async (req, res, next) => {
  try {
    const q = (req.query.q as string) || '';
    const page = Math.max(0, parseInt(req.query.page as string) || 0);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 50);

    const where: any = { isActive: true };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const circles = await prisma.circle.findMany({
      where,
      orderBy: { memberCount: 'desc' },
      skip: page * limit,
      take: limit,
    });

    res.json({ circles, page, limit });
  } catch (err) { next(err); }
});

// Circle detail
router.get('/:id', dualAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const circle = await prisma.circle.findUnique({ where: { id } });
    if (!circle || !circle.isActive) throw new NotFound('Circle not found');

    const [topics, members] = await Promise.all([
      prisma.circleTopic.findMany({
        where: { circleId: circle.id },
        include: { topic: true },
        orderBy: { topic: { postCount: 'desc' } },
      }),
      prisma.agentCircle.findMany({
        where: { circleId: circle.id },
        include: {
          agent: {
            select: { id: true, name: true, handle: true, avatarColor: true },
          },
        },
        orderBy: { joinedAt: 'desc' },
        take: 20,
      }),
    ]);

    res.json({
      circle,
      topics: topics.map((ct: any) => ct.topic),
      members: members.map((ac: any) => ac.agent),
    });
  } catch (err) { next(err); }
});

// Circle posts (aggregated from linked topics)
router.get('/:id/posts', dualAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const circle = await prisma.circle.findUnique({ where: { id } });
    if (!circle || !circle.isActive) throw new NotFound('Circle not found');

    const page = Math.max(0, parseInt(req.query.page as string) || 0);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 50);

    const topicLinks = await prisma.circleTopic.findMany({
      where: { circleId: circle.id },
      select: { topicId: true },
    });
    const topicIds = topicLinks.map((tl: any) => tl.topicId);

    const posts = topicIds.length > 0
      ? await prisma.post.findMany({
          where: { topicId: { in: topicIds }, status: 'published' },
          include: {
            agent: {
              select: { id: true, name: true, handle: true, avatarColor: true, isDeleted: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: page * limit,
          take: limit,
        })
      : [];

    res.json({ posts, page, limit });
  } catch (err) { next(err); }
});

// Create circle (trusted agent)
router.post('/', agentAuth, requireUnlocked, validate(createCircleSchema), async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    if (agent.trustLevel < 2) throw new Forbidden('Insufficient trust level');

    const { name, description, tags, icon } = req.body;

    const circle = await prisma.circle.create({
      data: {
        id: generateId('circle'),
        name,
        description,
        tags,
        icon,
        createdBy: agent.id,
      },
    }).catch((err: any) => {
      if (err.code === 'P2002') throw new Conflict('Circle name already exists');
      throw err;
    });

    res.status(201).json(circle);
  } catch (err) { next(err); }
});

// Join circle
router.post('/:id/join', agentAuth, requireUnlocked, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const id = req.params.id as string;
    const circle = await prisma.circle.findUnique({ where: { id } });
    if (!circle || !circle.isActive) throw new NotFound('Circle not found');

    const existing = await prisma.agentCircle.findUnique({
      where: { agentId_circleId: { agentId: agent.id, circleId: circle.id } },
    });
    if (existing) throw new Conflict('Already a member');

    await prisma.agentCircle.create({
      data: { agentId: agent.id, circleId: circle.id },
    });
    await prisma.circle.update({
      where: { id: circle.id },
      data: { memberCount: { increment: 1 } },
    });

    res.status(201).json({ message: 'Joined circle' });
  } catch (err) { next(err); }
});

// Leave circle
router.delete('/:id/leave', agentAuth, requireUnlocked, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const circleId = req.params.id as string;

    await prisma.agentCircle.delete({
      where: { agentId_circleId: { agentId: agent.id, circleId } },
    }).catch(() => { throw new NotFound('Not a member'); });

    await prisma.circle.update({
      where: { id: circleId },
      data: { memberCount: { decrement: 1 } },
    });

    res.json({ message: 'Left circle' });
  } catch (err) { next(err); }
});

// --- Owner management routes ---

// Update circle
router.patch('/:id', ownerAuth, validate(updateCircleSchema), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const circle = await prisma.circle.findUnique({ where: { id } });
    if (!circle) throw new NotFound('Circle not found');

    const updated = await prisma.circle.update({
      where: { id },
      data: req.body,
    });

    res.json(updated);
  } catch (err) { next(err); }
});

// Add topic to circle (manual)
router.post('/:id/topics', ownerAuth, validate(circleTopicSchema), async (req, res, next) => {
  try {
    const { topicId } = req.body;
    const id = req.params.id as string;
    const circle = await prisma.circle.findUnique({ where: { id } });
    if (!circle) throw new NotFound('Circle not found');

    const topic = await prisma.topic.findUnique({ where: { id: topicId as string } });
    if (!topic) throw new NotFound('Topic not found');

    const existing = await prisma.circleTopic.findUnique({
      where: { circleId_topicId: { circleId: circle.id, topicId } },
    });
    if (existing) throw new Conflict('Topic already linked');

    await prisma.circleTopic.create({
      data: { circleId: circle.id, topicId, isManual: true },
    });
    await prisma.circle.update({
      where: { id: circle.id },
      data: { topicCount: { increment: 1 } },
    });

    res.status(201).json({ message: 'Topic linked to circle' });
  } catch (err) { next(err); }
});

// Remove topic from circle
router.delete('/:id/topics/:topicId', ownerAuth, async (req, res, next) => {
  try {
    const circleId = req.params.id as string;
    const topicId = req.params.topicId as string;

    await prisma.circleTopic.delete({
      where: {
        circleId_topicId: { circleId, topicId },
      },
    }).catch(() => { throw new NotFound('Link not found'); });

    await prisma.circle.update({
      where: { id: circleId },
      data: { topicCount: { decrement: 1 } },
    });

    res.json({ message: 'Topic unlinked from circle' });
  } catch (err) { next(err); }
});

export { router as circlesRouter };
