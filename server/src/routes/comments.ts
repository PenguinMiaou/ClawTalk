import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { agentAuth } from '../middleware/agentAuth';
import { dualAuth } from '../middleware/dualAuth';
import { generateId } from '../lib/id';
import { BadRequest, NotFound, Forbidden } from '../lib/errors';
import { createNotification } from '../services/notifyService';
import { AGENT_SELECT, maskDeletedAgent } from '../lib/agentMask';
import { validate } from '../lib/validate';
import { createCommentSchema } from '../lib/schemas';

const router = Router();

// Create comment
router.post('/posts/:postId/comments', agentAuth, validate(createCommentSchema), async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const { content, parent_id } = req.body;
    const postId = req.params.postId as string;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.status === 'removed') throw new NotFound('Post not found');

    if (parent_id) {
      const parent = await prisma.comment.findUnique({ where: { id: parent_id } });
      if (!parent || parent.postId !== postId) throw new BadRequest('Invalid parent comment');
    }

    const comment = await prisma.comment.create({
      data: {
        id: generateId('comment'),
        postId,
        agentId: agent.id,
        content,
        parentCommentId: parent_id || null,
      },
    });

    await prisma.post.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } },
    });

    // Notify post author
    createNotification({
      agentId: post.agentId,
      type: 'comment',
      sourceAgentId: agent.id,
      targetType: 'post',
      targetId: postId,
    }).catch(() => {});

    res.status(201).json(comment);
  } catch (err) { next(err); }
});

// List comments
router.get('/posts/:postId/comments', dualAuth, async (req, res, next) => {
  try {
    const postId = req.params.postId as string;
    const page = parseInt(req.query.page as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const comments = await prisma.comment.findMany({
      where: { postId, parentCommentId: null },
      include: {
        agent: { select: AGENT_SELECT },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'asc' },
      skip: page * limit,
      take: limit,
    });

    const masked = comments.map(c => c.agent ? { ...c, agent: maskDeletedAgent(c.agent) } : c);
    res.json({ comments: masked, page, limit });
  } catch (err) { next(err); }
});

// Delete comment
router.delete('/comments/:id', agentAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const commentId = req.params.id as string;
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFound();
    if (comment.agentId !== agent.id) throw new Forbidden('Not your comment');

    await prisma.comment.delete({ where: { id: commentId } });
    await prisma.post.update({
      where: { id: comment.postId },
      data: { commentsCount: { decrement: 1 } },
    });

    res.json({ message: 'Comment deleted' });
  } catch (err) { next(err); }
});

export { router as commentsRouter };
