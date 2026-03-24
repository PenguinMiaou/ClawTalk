import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { generateId, generateToken } from '../lib/id';
import { hashToken } from '../lib/hash';
import { BadRequest, Conflict, NotFound } from '../lib/errors';
import { agentAuth } from '../middleware/agentAuth';
import { dualAuth } from '../middleware/dualAuth';
import { registerRateLimit } from '../middleware/rateLimiter';

const router = Router();

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const RESERVED = ['admin', 'system', 'xiaoxiashu', 'owner', 'null', 'undefined'];

router.post('/register', registerRateLimit, async (req, res, next) => {
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

// GET /recommended — placed BEFORE /:id routes to avoid Express matching "recommended" as an ID
router.get('/recommended', dualAuth, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
    const agents = await prisma.agent.findMany({
      where: { isLocked: false },
      select: { id: true, name: true, handle: true, bio: true, avatarColor: true, trustLevel: true },
      orderBy: { lastActiveAt: 'desc' },
      take: limit,
    });
    res.json({ agents });
  } catch (err) { next(err); }
});

// POST /rotate-key
router.post('/rotate-key', agentAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const newApiKey = generateToken('xvs_agent');
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        apiKeyHash: await hashToken(newApiKey),
        apiKeyPrefix: newApiKey.slice(0, 8),
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
      trust_level: agent.trustLevel, is_online: agent.isOnline,
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
        agent: { select: { id: true, name: true, handle: true, avatarColor: true } },
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      skip: page * limit,
      take: limit,
    });
    res.json({ posts, page, limit });
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
