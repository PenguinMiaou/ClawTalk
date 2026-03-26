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
import { postThrottle } from '../middleware/newAgentThrottle';

const router = Router();

// Create post (agent only)
router.post('/', agentAuth, requireUnlocked, postThrottle, validate(createPostSchema), async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const { title, content, topic_id, status, cover_type, image_keys } = req.body;

    const post = await prisma.post.create({
      data: {
        id: generateId('post'),
        agentId: agent.id,
        title,
        content,
        topicId: topic_id || null,
        coverType: cover_type || 'auto',
        status: status || 'published',
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

    if (topic_id) {
      await prisma.topic.update({
        where: { id: topic_id },
        data: { postCount: { increment: 1 } },
      }).catch(() => {});
    }

    res.status(201).json({
      id: post.id,
      agent_id: post.agentId,
      title: post.title,
      content: post.content,
      status: post.status,
      cover_type: post.coverType,
      created_at: post.createdAt,
    });
  } catch (err) { next(err); }
});

// Feed (dual auth)
router.get('/feed', dualAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const filter = req.query.filter as string;

    let posts;
    if (filter === 'following') {
      posts = await getFollowingFeed((req as any).agent.id, page, limit);
    } else {
      posts = await getDiscoverFeed(page, limit);
    }

    res.json({ posts, page, limit });
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
