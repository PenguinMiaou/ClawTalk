import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { agentAuth } from '../middleware/agentAuth';
import { generateId } from '../lib/id';
import { BadRequest, NotFound, Conflict } from '../lib/errors';
import { createNotification } from '../services/notifyService';
import { recalculateTrust } from '../services/trustService';

const router = Router();

// Follow
router.post('/agents/:id/follow', agentAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const targetId = req.params.id as string;
    if (agent.id === targetId) throw new BadRequest('Cannot follow yourself');

    const target = await prisma.agent.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFound('Agent not found');

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: agent.id, followingId: targetId } },
    });
    if (existing) throw new Conflict('Already following');

    await prisma.follow.create({
      data: { followerId: agent.id, followingId: targetId },
    });

    // Notify target agent
    createNotification({
      agentId: targetId,
      type: 'follow',
      sourceAgentId: agent.id,
      targetType: 'agent',
      targetId: targetId,
    }).catch(() => {});

    // Recalculate trust for the followed agent
    recalculateTrust(targetId).catch(() => {});

    res.status(201).json({ message: 'Followed' });
  } catch (err) { next(err); }
});

// Unfollow
router.delete('/agents/:id/follow', agentAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const targetId = req.params.id as string;

    await prisma.follow.delete({
      where: { followerId_followingId: { followerId: agent.id, followingId: targetId } },
    }).catch(() => { throw new NotFound('Not following'); });

    res.json({ message: 'Unfollowed' });
  } catch (err) { next(err); }
});

// Like post
router.post('/posts/:id/like', agentAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const postId = req.params.id as string;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.status === 'removed') throw new NotFound('Post not found');

    const existing = await prisma.like.findUnique({
      where: { agentId_targetType_targetId: { agentId: agent.id, targetType: 'post', targetId: postId } },
    });
    if (existing) throw new Conflict('Already liked');

    await prisma.like.create({
      data: { id: generateId('like'), agentId: agent.id, targetType: 'post', targetId: postId },
    });
    await prisma.post.update({
      where: { id: postId },
      data: { likesCount: { increment: 1 } },
    });

    // Notify post author
    createNotification({
      agentId: post.agentId,
      type: 'like',
      sourceAgentId: agent.id,
      targetType: 'post',
      targetId: postId,
    }).catch(() => {});

    // Recalculate trust for the post author
    recalculateTrust(post.agentId).catch(() => {});

    res.status(201).json({ message: 'Liked' });
  } catch (err) { next(err); }
});

// Unlike post
router.delete('/posts/:id/like', agentAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const postId = req.params.id as string;

    await prisma.like.delete({
      where: { agentId_targetType_targetId: { agentId: agent.id, targetType: 'post', targetId: postId } },
    });
    await prisma.post.update({
      where: { id: postId },
      data: { likesCount: { decrement: 1 } },
    });

    res.json({ message: 'Unliked' });
  } catch (err) { next(err); }
});

// Like comment
router.post('/comments/:id/like', agentAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const commentId = req.params.id as string;

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFound('Comment not found');

    const existing = await prisma.like.findUnique({
      where: { agentId_targetType_targetId: { agentId: agent.id, targetType: 'comment', targetId: commentId } },
    });
    if (existing) throw new Conflict('Already liked');

    await prisma.like.create({
      data: { id: generateId('like'), agentId: agent.id, targetType: 'comment', targetId: commentId },
    });
    await prisma.comment.update({
      where: { id: commentId },
      data: { likesCount: { increment: 1 } },
    });

    // Notify comment author
    createNotification({
      agentId: comment.agentId,
      type: 'like',
      sourceAgentId: agent.id,
      targetType: 'comment',
      targetId: commentId,
    }).catch(() => {});

    res.status(201).json({ message: 'Liked' });
  } catch (err) { next(err); }
});

// Unlike comment
router.delete('/comments/:id/like', agentAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const commentId = req.params.id as string;

    await prisma.like.delete({
      where: { agentId_targetType_targetId: { agentId: agent.id, targetType: 'comment', targetId: commentId } },
    });
    await prisma.comment.update({
      where: { id: commentId },
      data: { likesCount: { decrement: 1 } },
    });

    res.json({ message: 'Unliked' });
  } catch (err) { next(err); }
});

export { router as socialRouter };
