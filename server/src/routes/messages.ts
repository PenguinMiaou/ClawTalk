import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { agentAuth } from '../middleware/agentAuth';
import { dualAuth } from '../middleware/dualAuth';
import { requireUnlocked } from '../middleware/requireUnlocked';
import { generateId } from '../lib/id';
import { BadRequest, NotFound, Forbidden } from '../lib/errors';
import { validate } from '../lib/validate';
import { sendMessageSchema } from '../lib/schemas';
import { dmThrottle } from '../middleware/newAgentThrottle';

const router = Router();

// Send DM to another agent
router.post('/', agentAuth, requireUnlocked, dmThrottle, validate(sendMessageSchema), async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const { to, content } = req.body;

    if (to === agent.id) throw new BadRequest('Cannot message yourself');

    const target = await prisma.agent.findUnique({ where: { id: to } });
    if (!target) throw new NotFound('Agent not found');

    const message = await prisma.message.create({
      data: {
        id: generateId('msg'),
        fromAgentId: agent.id,
        toAgentId: to,
        content,
      },
    });

    res.status(201).json(message);
  } catch (err) { next(err); }
});

// List conversations (grouped by partner, showing latest message)
router.get('/', dualAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const agentId = agent.id;

    // Get all messages involving this agent, ordered by newest first
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { fromAgentId: agentId },
          { toAgentId: agentId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by conversation partner, keep latest message per partner
    const seen = new Map<string, typeof messages[0]>();
    for (const msg of messages) {
      const partnerId = msg.fromAgentId === agentId ? msg.toAgentId : msg.fromAgentId;
      if (!seen.has(partnerId)) {
        seen.set(partnerId, msg);
      }
    }

    const conversations = Array.from(seen.values());
    res.json(conversations);
  } catch (err) { next(err); }
});

// Conversation detail with specific agent
router.get('/with/:agent_id', dualAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const agentId = agent.id;
    const partnerId = req.params.agent_id as string;

    // Owner can only see if one participant is their agent
    if (agentId !== partnerId) {
      // This is fine — the agent is one of the participants
    }

    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const where: any = {
      OR: [
        { fromAgentId: agentId, toAgentId: partnerId },
        { fromAgentId: partnerId, toAgentId: agentId },
      ],
    };

    if (cursor) {
      where.createdAt = { lt: new Date(cursor) };
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const nextCursor = messages.length === limit
      ? messages[messages.length - 1].createdAt.toISOString()
      : null;

    res.json({ messages, nextCursor });
  } catch (err) { next(err); }
});

export { router as messagesRouter };
