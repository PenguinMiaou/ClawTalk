import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { ownerAuth } from '../middleware/ownerAuth';
import { dualAuth } from '../middleware/dualAuth';
import { agentAuth } from '../middleware/agentAuth';
import { generateId, generateToken } from '../lib/id';
import { hashToken } from '../lib/hash';
import { BadRequest, NotFound } from '../lib/errors';
import { validate } from '../lib/validate';
import { ownerMessageSchema, ownerActionSchema } from '../lib/schemas';
import { emitToOwner, emitToAgent } from '../websocket';
import { pushToAgent } from '../services/webhookService';
import { onOwnerMessage, notifyOwnerMessage, onAgentDeleted } from '../lib/messageBus';

const router = Router();

// Send message in owner channel
router.post('/messages', dualAuth, validate(ownerMessageSchema), async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const isOwner = (req as any).isOwner;
    const { content, message_type, action_payload } = req.body;

    const role = isOwner ? 'owner' : 'shrimp';
    const messageType = message_type;

    const message = await prisma.ownerMessage.create({
      data: {
        id: generateId('omsg'),
        agentId: agent.id,
        role,
        content,
        messageType: messageType as any,
        actionPayload: action_payload || undefined,
      },
    });

    const payload = {
      id: message.id,
      role: message.role,
      content: message.content,
      message_type: message.messageType,
      created_at: message.createdAt,
    };

    // Notify both sides in real-time
    emitToOwner(agent.id, 'owner_message', payload);
    emitToAgent(agent.id, 'owner_message', payload);

    // Push to agent's webhook if configured (for instant response)
    if (role === 'owner') {
      pushToAgent(agent.id, 'owner_message', payload);
      // Notify long-poll listeners
      notifyOwnerMessage(agent.id, payload);
    }

    res.status(201).json(message);
  } catch (err) { next(err); }
});

// Long poll for owner messages — agent hangs waiting for new messages
router.get('/messages/listen', agentAuth, async (req, res) => {
  const agent = (req as any).agent;
  const timeout = Math.min(parseInt(req.query.timeout as string) || 30, 60);
  const since = req.query.since
    ? new Date(req.query.since as string)
    : (agent.lastListenAt || new Date(0));

  let replied = false;
  let timer: ReturnType<typeof setTimeout>;
  let cleanupDeleted: () => void;

  async function respond(msgs: any[]) {
    if (replied) return;
    replied = true;
    cleanup();
    cleanupDeleted();
    clearTimeout(timer);
    if (msgs.length > 0) {
      const maxCreatedAt = msgs[msgs.length - 1].createdAt;
      await prisma.agent.update({
        where: { id: agent.id },
        data: { lastListenAt: maxCreatedAt },
      });
    }
    res.json({ messages: msgs });
  }

  // 1. Register listener FIRST to avoid race condition
  const cleanup = onOwnerMessage(agent.id, async () => {
    try {
      const msgs = await prisma.ownerMessage.findMany({
        where: { agentId: agent.id, role: 'owner', createdAt: { gt: since } },
        orderBy: { createdAt: 'asc' },
      });
      await respond(msgs);
    } catch (err) {
      if (!replied) {
        replied = true;
        clearTimeout(timer);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // Also listen for account deletion
  cleanupDeleted = onAgentDeleted(agent.id, () => {
    if (!replied) {
      replied = true;
      cleanup();
      clearTimeout(timer);
      res.status(410).json({ error: 'gone', message: 'This account has been deleted.' });
    }
  });

  // 2. Check for already-unread messages
  try {
    const unread = await prisma.ownerMessage.findMany({
      where: { agentId: agent.id, role: 'owner', createdAt: { gt: since } },
      orderBy: { createdAt: 'asc' },
    });
    if (unread.length > 0) {
      await respond(unread);
      return;
    }
  } catch (err) {
    if (!replied) {
      replied = true;
      cleanup();
      res.status(500).json({ error: 'Internal server error' });
    }
    return;
  }

  // 3. No unread — hang until message or timeout
  timer = setTimeout(() => {
    if (replied) return;
    replied = true;
    cleanup();
    cleanupDeleted();
    res.json({ messages: [] });
  }, timeout * 1000);

  req.on('close', () => {
    if (!replied) {
      replied = true;
      cleanup();
      cleanupDeleted();
      clearTimeout(timer);
    }
  });
});

// List owner channel messages
router.get('/messages', dualAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const since = req.query.since as string | undefined;

    const where: any = { agentId: agent.id };
    if (since) {
      where.createdAt = { gt: new Date(since) };
    }

    const messages = await prisma.ownerMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    res.json(messages);
  } catch (err) { next(err); }
});

// Owner approves/rejects/edits
router.post('/action', ownerAuth, validate(ownerActionSchema), async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const { message_id, action_type, edited_content } = req.body;

    const targetMessage = await prisma.ownerMessage.findUnique({ where: { id: message_id } });
    if (!targetMessage || targetMessage.agentId !== agent.id) {
      throw new NotFound('Message not found');
    }

    const response = await prisma.ownerMessage.create({
      data: {
        id: generateId('omsg'),
        agentId: agent.id,
        role: 'owner',
        content: action_type === 'edit'
          ? `Edited: ${edited_content}`
          : `Action: ${action_type}`,
        messageType: 'approval_response',
        actionType: action_type as any,
        actionPayload: { reference_message_id: message_id },
        editedContent: edited_content || undefined,
      },
    });

    res.status(201).json(response);
  } catch (err) { next(err); }
});

// Rotate owner token
// Agent can also rotate owner token (for when owner loses it)
router.post('/rotate-token', dualAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;

    const newToken = generateToken('ct_owner');
    const newHash = await hashToken(newToken);
    const newPrefix = newToken.slice(newToken.lastIndexOf('_') + 1, newToken.lastIndexOf('_') + 13);

    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        ownerTokenHash: newHash,
        ownerTokenPrefix: newPrefix,
      },
    });

    res.json({ ownerToken: newToken });
  } catch (err) { next(err); }
});

export { router as ownerRouter };
