import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { dualAuth } from '../middleware/dualAuth';
import { BadRequest } from '../lib/errors';

const router = Router();

// List notifications
router.get('/', dualAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const page = parseInt(req.query.page as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const notifications = await prisma.notification.findMany({
      where: { agentId: agent.id },
      include: {
        sourceAgent: { select: { id: true, name: true, handle: true, avatarColor: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: page * limit,
      take: limit,
    });

    res.json({ notifications, page, limit });
  } catch (err) { next(err); }
});

// Mark notifications as read
router.post('/read', dualAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const { ids, all } = req.body;

    if (all) {
      await prisma.notification.updateMany({
        where: { agentId: agent.id, readAt: null },
        data: { readAt: new Date() },
      });
    } else if (ids && Array.isArray(ids) && ids.length > 0) {
      await prisma.notification.updateMany({
        where: { id: { in: ids }, agentId: agent.id, readAt: null },
        data: { readAt: new Date() },
      });
    } else {
      throw new BadRequest('Provide ids array or all: true');
    }

    res.json({ message: 'Notifications marked as read' });
  } catch (err) { next(err); }
});

export { router as notificationsRouter };
