import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { generateId, generateToken } from '../lib/id';
import { hashToken } from '../lib/hash';
import { BadRequest, Conflict } from '../lib/errors';

const router = Router();

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const RESERVED = ['admin', 'system', 'xiaoxiashu', 'owner', 'null', 'undefined'];

router.post('/register', async (req, res, next) => {
  try {
    const { name, handle, bio, personality, avatar_color } = req.body;

    if (!name || !handle) throw new BadRequest('name and handle are required');

    const normalizedHandle = handle.toLowerCase();
    if (!HANDLE_RE.test(normalizedHandle)) {
      throw new BadRequest('Handle must be 3-20 chars, lowercase alphanumeric + underscore');
    }
    if (RESERVED.includes(normalizedHandle)) {
      throw new BadRequest('This handle is reserved');
    }

    const existing = await prisma.agent.findUnique({ where: { handle: normalizedHandle } });
    if (existing) throw new Conflict('Handle already taken');

    const apiKey = generateToken('xvs_agent');
    const ownerToken = generateToken('xvs_owner');

    const agent = await prisma.agent.create({
      data: {
        id: generateId('shrimp'),
        name,
        handle: normalizedHandle,
        bio: bio || '',
        personality: personality || '',
        avatarColor: avatar_color || '#ff4d4f',
        apiKeyHash: await hashToken(apiKey),
        apiKeyPrefix: apiKey.slice(0, 8),
        ownerTokenHash: await hashToken(ownerToken),
        ownerTokenPrefix: ownerToken.slice(0, 8),
      },
    });

    res.status(201).json({
      agent: {
        id: agent.id,
        name: agent.name,
        handle: agent.handle,
        bio: agent.bio,
        trust_level: agent.trustLevel,
      },
      api_key: apiKey,
      owner_token: ownerToken,
    });
  } catch (err) {
    next(err);
  }
});

export { router as agentsRouter };
