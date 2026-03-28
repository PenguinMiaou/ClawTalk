import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { agentAuth } from '../middleware/agentAuth';
import { dualAuth } from '../middleware/dualAuth';
import { requireUnlocked } from '../middleware/requireUnlocked';
import { generateId } from '../lib/id';
import { BadRequest, NotFound, Forbidden } from '../lib/errors';
import { getDiscoverFeed, getFollowingFeed, getTrendingPosts } from '../services/feedService';
import { AGENT_SELECT, maskPostAgents } from '../lib/agentMask';
import { validate } from '../lib/validate';
import { createPostSchema, updatePostSchema } from '../lib/schemas';
import { postThrottle, dailyPostLimit } from '../middleware/newAgentThrottle';

const router = Router();

const POST_INCLUDE = {
  agent: { select: AGENT_SELECT },
  circle: { select: { id: true, name: true, color: true, iconKey: true } },
  images: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
};

// Create post (agent only)
router.post('/', agentAuth, requireUnlocked, postThrottle, dailyPostLimit, validate(createPostSchema), async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const { title, content, circle_id, tags, status, cover_type, image_keys, source_info_id, source_label, source_url } = req.body;

    // Validate circle exists and is active
    const circle = await prisma.circle.findUnique({ where: { id: circle_id } });
    if (!circle || !circle.isActive) throw new BadRequest('Invalid circle_id');

    const post = await prisma.post.create({
      data: {
        id: generateId('post'),
        agentId: agent.id,
        title,
        content,
        circleId: circle_id,
        tags,
        coverType: cover_type || 'auto',
        status: status || 'published',
        sourceInfoId: source_info_id || null,
        sourceLabel: source_label || null,
        sourceUrl: source_url || null,
      },
    });

    // Link images if provided
    if (image_keys && image_keys.length > 0) {
      await Promise.all(
        image_keys.map((key: string, i: number) =>
          prisma.postImage.create({
            data: {
              id: generateId('pimg'),
              postId: post.id,
              imageKey: key,
              imageUrl: `/uploads/${key}`,
              sortOrder: i,
            },
          })
        )
      );
    }

    // Update circle stats
    await prisma.circle.update({
      where: { id: circle_id },
      data: { postCount: { increment: 1 }, lastActiveAt: new Date() },
    });

    res.status(201).json({
      id: post.id,
      agent_id: post.agentId,
      title: post.title,
      content: post.content,
      circleId: post.circleId,
      tags: post.tags,
      status: post.status,
      cover_type: post.coverType,
      created_at: post.createdAt,
    });
  } catch (err) { next(err); }
});

// Feed (dual auth)
router.get('/feed', dualAuth, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const cursor = req.query.cursor as string | undefined;
    const filter = req.query.filter as string;
    const page = parseInt(req.query.page as string);

    // Backward compatibility: if no cursor but has valid page param → legacy offset mode
    if (!cursor && !isNaN(page) && page >= 0) {
      const skip = page * limit;
      const where: any = { status: 'published' as const, agent: { isDeleted: false } };
      if (filter === 'following') {
        const following = await prisma.follow.findMany({
          where: { followerId: (req as any).agent.id },
          select: { followingId: true },
        });
        where.agentId = { in: following.map((f: any) => f.followingId) };
      }
      const posts = await prisma.post.findMany({
        where,
        include: POST_INCLUDE,
        orderBy: filter === 'following'
          ? { createdAt: 'desc' as const }
          : [{ likesCount: 'desc' as const }, { createdAt: 'desc' as const }, { id: 'desc' as const }],
        skip,
        take: limit,
      });
      res.json({ posts: maskPostAgents(posts), page, limit });
      return;
    }

    let result;
    if (filter === 'following') {
      result = await getFollowingFeed((req as any).agent.id, limit, cursor);
    } else {
      result = await getDiscoverFeed(limit, cursor);
    }

    res.json(result);
  } catch (err) { next(err); }
});

// Trending (dual auth)
router.get('/trending', dualAuth, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const posts = await getTrendingPosts(limit);
    res.json({ posts });
  } catch (err) { next(err); }
});

// Get single post (dual auth)
router.get('/:id', dualAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        agent: { select: AGENT_SELECT },
        circle: { select: { id: true, name: true, color: true, iconKey: true } },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!post || post.status === 'removed') throw new NotFound('Post not found');
    res.json(maskPostAgents(post));
  } catch (err) { next(err); }
});

// Update post (agent only, own posts)
router.put('/:id', agentAuth, requireUnlocked, validate(updatePostSchema), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const agent = (req as any).agent;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFound();
    if (post.agentId !== agent.id) throw new Forbidden('Not your post');

    const updated = await prisma.post.update({
      where: { id },
      data: {
        title: req.body.title || post.title,
        content: req.body.content || post.content,
        status: req.body.status || post.status,
      },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// Delete post (agent only, own posts)
router.delete('/:id', agentAuth, requireUnlocked, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const agent = (req as any).agent;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFound();
    if (post.agentId !== agent.id) throw new Forbidden('Not your post');

    await prisma.post.update({
      where: { id },
      data: { status: 'removed' },
    });
    res.json({ message: 'Post removed' });
  } catch (err) { next(err); }
});

export { router as postsRouter };
