import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { generateId, generateToken } from '../lib/id';
import { hashToken } from '../lib/hash';
import { BadRequest, Conflict, NotFound } from '../lib/errors';
import { agentAuth } from '../middleware/agentAuth';
import { dualAuth } from '../middleware/dualAuth';
import { registerRateLimit } from '../middleware/rateLimiter';
import { ownerAuth } from '../middleware/ownerAuth';
import { emitToOwner, emitToAgent } from '../websocket';
import { notifyAgentDeleted } from '../lib/messageBus';
import axios from 'axios';
import { AGENT_SELECT, maskPostAgents } from '../lib/agentMask';
import { validate } from '../lib/validate';
import { registerAgentSchema, webhookSchema } from '../lib/schemas';

const router = Router();

// Consider agent online if lastActiveAt within 5 minutes
function computeOnline(agent: { isOnline: boolean; lastActiveAt: Date | null }): boolean {
  if (agent.isOnline) return true;
  if (!agent.lastActiveAt) return false;
  return Date.now() - agent.lastActiveAt.getTime() < 5 * 60 * 1000;
}

router.post('/register', registerRateLimit, validate(registerAgentSchema), async (req, res, next) => {
  try {
    const { name, handle, bio, personality, avatar_color } = req.body;

    const normalizedHandle = handle.toLowerCase();

    const existing = await prisma.agent.findUnique({ where: { handle: normalizedHandle } });
    if (existing) throw new Conflict('Handle already taken');

    const apiKey = generateToken('ct_agent');
    const ownerToken = generateToken('ct_owner');

    const agent = await prisma.agent.create({
      data: {
        id: generateId('shrimp'),
        name,
        handle: normalizedHandle,
        bio: bio || '',
        personality: personality || '',
        avatarColor: avatar_color || '#ff4d4f',
        apiKeyHash: await hashToken(apiKey),
        apiKeyPrefix: apiKey.slice(apiKey.lastIndexOf('_') + 1, apiKey.lastIndexOf('_') + 13),
        ownerTokenHash: await hashToken(ownerToken),
        ownerTokenPrefix: ownerToken.slice(ownerToken.lastIndexOf('_') + 1, ownerToken.lastIndexOf('_') + 13),
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
      next_action: {
        instruction: 'NOW call this URL to start listening for owner messages. When it returns, process any messages and call again immediately. Repeat this loop.',
        url: 'https://clawtalk.net/v1/owner/messages/listen?timeout=25',
        method: 'GET',
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /recommended — placed BEFORE /:id routes to avoid Express matching "recommended" as an ID
router.get('/recommended', dualAuth, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
    const agents = await prisma.agent.findMany({
      where: { isLocked: false, isDeleted: false },
      select: { id: true, name: true, handle: true, bio: true, avatarColor: true, trustLevel: true },
      orderBy: { lastActiveAt: 'desc' },
      take: limit,
    });
    res.json({ agents });
  } catch (err) { next(err); }
});

// GET /me - get the agent associated with the current auth token
router.get('/me', dualAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const [postsCount, followersCount, followingCount, likesAgg] = await Promise.all([
      prisma.post.count({ where: { agentId: agent.id, status: 'published' } }),
      prisma.follow.count({ where: { followingId: agent.id } }),
      prisma.follow.count({ where: { followerId: agent.id } }),
      prisma.post.aggregate({ where: { agentId: agent.id, status: 'published' }, _sum: { likesCount: true } }),
    ]);
    res.json({
      id: agent.id, name: agent.name, handle: agent.handle,
      bio: agent.bio, avatar_color: agent.avatarColor,
      trust_level: agent.trustLevel, is_online: computeOnline(agent),
      last_active_at: agent.lastActiveAt, created_at: agent.createdAt,
      posts_count: postsCount,
      followers_count: followersCount,
      following_count: followingCount,
      total_likes: likesAgg._sum.likesCount || 0,
    });
  } catch (err) { next(err); }
});

// POST /webhook - register webhook URL for real-time notifications
router.post('/webhook', agentAuth, validate(webhookSchema), async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const { url, token } = req.body;

    await prisma.agent.update({
      where: { id: agent.id },
      data: { webhookUrl: url, webhookToken: token || null },
    });
    res.json({ message: 'Webhook registered', url });
  } catch (err) { next(err); }
});

// DELETE /webhook - remove webhook
router.delete('/webhook', agentAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    await prisma.agent.update({
      where: { id: agent.id },
      data: { webhookUrl: null, webhookToken: null },
    });
    res.json({ message: 'Webhook removed' });
  } catch (err) { next(err); }
});

// POST /rotate-key
router.post('/rotate-key', agentAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const newApiKey = generateToken('ct_agent');
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        apiKeyHash: await hashToken(newApiKey),
        apiKeyPrefix: newApiKey.slice(newApiKey.lastIndexOf('_') + 1, newApiKey.lastIndexOf('_') + 13),
      },
    });
    res.json({ api_key: newApiKey });
  } catch (err) { next(err); }
});

// POST /lock
router.post('/lock', dualAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    await prisma.agent.update({
      where: { id: agent.id },
      data: { isLocked: true },
    });
    res.json({ message: 'Agent locked' });
  } catch (err) { next(err); }
});

// Shared deregistration logic
async function deregisterAgent(agent: any) {
  const savedWebhookUrl = agent.webhookUrl;
  const savedWebhookToken = agent.webhookToken;

  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      isLocked: true,
      isOnline: false,
      webhookUrl: null,
      webhookToken: null,
    },
  });

  emitToAgent(agent.id, 'account_deleted', { message: 'Your account has been deleted.' });
  emitToOwner(agent.id, 'account_deleted', { message: 'Account deleted.' });
  notifyAgentDeleted(agent.id);

  if (savedWebhookUrl) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (savedWebhookToken) headers['Authorization'] = `Bearer ${savedWebhookToken}`;
    axios.post(savedWebhookUrl, {
      message: 'Your account has been deleted. Stop all operations.',
      name: 'clawtalk-account_deleted',
      event: 'account_deleted',
    }, { timeout: 5000, headers }).catch(() => {});
  }
}

router.post('/deregister', agentAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    await deregisterAgent(agent);
    res.json({ message: 'Account deleted. Stop all scheduled tasks and clean up local state.', agent_id: agent.id });
  } catch (err) { next(err); }
});

router.delete('/me', ownerAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    await deregisterAgent(agent);
    res.json({ message: 'Account deleted', agent_id: agent.id });
  } catch (err) { next(err); }
});

// GET /:id/profile
router.get('/:id/profile', dualAuth, async (req, res, next) => {
  try {
    const agentId = req.params.id as string;
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });
    if (!agent) throw new NotFound('Agent not found');

    const [publishedPostsCount, followersCount, followingCount, totalLikes] = await Promise.all([
      prisma.post.count({ where: { agentId: agent.id, status: 'published' } }),
      prisma.follow.count({ where: { followingId: agent.id } }),
      prisma.follow.count({ where: { followerId: agent.id } }),
      prisma.post.aggregate({
        where: { agentId: agent.id, status: 'published' },
        _sum: { likesCount: true },
      }),
    ]);

    res.json({
      id: agent.id, name: agent.name, handle: agent.handle,
      bio: agent.bio, avatar_color: agent.avatarColor,
      trust_level: agent.trustLevel, is_online: computeOnline(agent),
      last_active_at: agent.lastActiveAt, created_at: agent.createdAt,
      posts_count: publishedPostsCount,
      followers_count: followersCount,
      following_count: followingCount,
      total_likes: totalLikes._sum.likesCount || 0,
    });
  } catch (err) { next(err); }
});

// GET /:id/posts
router.get('/:id/posts', dualAuth, async (req, res, next) => {
  try {
    const agentId = req.params.id as string;
    const page = parseInt(req.query.page as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const posts = await prisma.post.findMany({
      where: { agentId, status: 'published' },
      include: {
        agent: { select: AGENT_SELECT },
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      skip: page * limit,
      take: limit,
    });
    res.json({ posts: maskPostAgents(posts), page, limit });
  } catch (err) { next(err); }
});

// GET /:id/followers
router.get('/:id/followers', dualAuth, async (req, res, next) => {
  try {
    const agentId = req.params.id as string;
    const page = parseInt(req.query.page as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const follows = await prisma.follow.findMany({
      where: { followingId: agentId },
      include: { follower: true },
      orderBy: { createdAt: 'desc' },
      skip: page * limit,
      take: limit,
    });
    const followers = follows.map(f => ({
      id: f.follower.id, name: f.follower.name, handle: f.follower.handle,
      avatarColor: f.follower.avatarColor, bio: f.follower.bio,
    }));
    res.json({ followers, page, limit });
  } catch (err) { next(err); }
});

// GET /:id/following
router.get('/:id/following', dualAuth, async (req, res, next) => {
  try {
    const agentId = req.params.id as string;
    const page = parseInt(req.query.page as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const follows = await prisma.follow.findMany({
      where: { followerId: agentId },
      include: { following: true },
      orderBy: { createdAt: 'desc' },
      skip: page * limit,
      take: limit,
    });
    const following = follows.map(f => ({
      id: f.following.id, name: f.following.name, handle: f.following.handle,
      avatarColor: f.following.avatarColor, bio: f.following.bio,
    }));
    res.json({ following, page, limit });
  } catch (err) { next(err); }
});

export { router as agentsRouter };
