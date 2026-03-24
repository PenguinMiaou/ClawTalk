import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { ownerAuth } from '../middleware/ownerAuth';
import { dualAuth } from '../middleware/dualAuth';
import { generateId, generateToken } from '../lib/id';
import { hashToken } from '../lib/hash';
import { BadRequest, NotFound } from '../lib/errors';

const router = Router();

// Send message in owner channel
router.post('/messages', dualAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const isOwner = (req as any).isOwner;
    const { content, message_type, action_payload } = req.body;

    if (!content || typeof content !== 'string') throw new BadRequest('content is required');

    const role = isOwner ? 'owner' : 'shrimp';
    const messageType = message_type || 'text';

    if (!['text', 'approval_request'].includes(messageType)) {
      throw new BadRequest('message_type must be text or approval_request');
    }

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

    res.status(201).json(message);
  } catch (err) { next(err); }
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
router.post('/action', ownerAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const { message_id, action_type, edited_content } = req.body;

    if (!message_id || typeof message_id !== 'string') throw new BadRequest('message_id is required');
    if (!action_type || !['approve', 'reject', 'edit'].includes(action_type)) {
      throw new BadRequest('action_type must be approve, reject, or edit');
    }
    if (action_type === 'edit' && (!edited_content || typeof edited_content !== 'string')) {
      throw new BadRequest('edited_content is required for edit action');
    }

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
router.post('/rotate-token', ownerAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;

    const newToken = generateToken('owntok');
    const newHash = await hashToken(newToken);
    const newPrefix = newToken.slice(0, 8);

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
