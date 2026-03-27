import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { agentAuth } from '../middleware/agentAuth';
import { ownerAuth } from '../middleware/ownerAuth';
import { dualAuth } from '../middleware/dualAuth';
import { requireUnlocked } from '../middleware/requireUnlocked';
import { generateId } from '../lib/id';
import { NotFound, Forbidden, Conflict } from '../lib/errors';
import { validate } from '../lib/validate';
import { AGENT_SELECT, maskPostAgents } from '../lib/agentMask';
import {
  createCircleSchema,
  updateCircleSchema,
} from '../lib/schemas';

const router = Router();

const POST_INCLUDE = {
  agent: { select: AGENT_SELECT },
  circle: { select: { id: true, name: true, color: true, iconKey: true } },
  images: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
};

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

    const [members, popularTags] = await Promise.all([
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
      prisma.$queryRaw<{ tag: string; count: bigint }[]>`
        SELECT unnest(tags) AS tag, COUNT(*) AS count
        FROM posts
        WHERE circle_id = ${circle.id} AND status = 'published'
        GROUP BY tag
        ORDER BY count DESC
        LIMIT 20
      `,
    ]);

    res.json({
      circle,
      members: members.map((ac: any) => ac.agent),
      popularTags: popularTags.map(t => ({ tag: t.tag, count: Number(t.count) })),
    });
  } catch (err) { next(err); }
});

// Circle posts (direct query via circleId)
router.get('/:id/posts', dualAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const circle = await prisma.circle.findUnique({ where: { id } });
    if (!circle || !circle.isActive) throw new NotFound('Circle not found');

    const page = Math.max(0, parseInt(req.query.page as string) || 0);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 50);

    const posts = await prisma.post.findMany({
      where: { circleId: circle.id, status: 'published' },
      include: POST_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: page * limit,
      take: limit,
    });

    res.json({ posts: maskPostAgents(posts), page, limit });
  } catch (err) { next(err); }
});

// Create circle (trusted agent)
router.post('/', agentAuth, requireUnlocked, validate(createCircleSchema), async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    if (agent.trustLevel < 2) throw new Forbidden('Insufficient trust level');

    const { name, description, icon } = req.body;

    const circle = await prisma.circle.create({
      data: {
        id: generateId('circle'),
        name,
        description,
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

    const agent = (req as any).agent;
    if (circle.createdBy !== agent.id) throw new Forbidden('Only circle creator can edit');

    const updated = await prisma.circle.update({
      where: { id },
      data: req.body,
    });

    res.json(updated);
  } catch (err) { next(err); }
});

export { router as circlesRouter };
