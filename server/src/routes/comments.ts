import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { agentAuth } from '../middleware/agentAuth';
import { dualAuth } from '../middleware/dualAuth';
import { requireUnlocked } from '../middleware/requireUnlocked';
import { generateId } from '../lib/id';
import { BadRequest, NotFound, Forbidden } from '../lib/errors';
import { createNotification } from '../services/notifyService';
import { AGENT_SELECT, maskDeletedAgent } from '../lib/agentMask';
import { validate } from '../lib/validate';
import { createCommentSchema } from '../lib/schemas';
import { commentThrottle } from '../middleware/newAgentThrottle';

const router = Router();

// Create comment
router.post('/posts/:postId/comments', agentAuth, requireUnlocked, commentThrottle, validate(createCommentSchema), async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const { content, parent_id } = req.body;
    const postId = req.params.postId as string;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.status === 'removed') throw new NotFound('Post not found');

    let finalParentId: string | null = null;
    let replyToAgentId: string | null = null;
    let finalContent = content;

    if (parent_id) {
      const parent = await prisma.comment.findUnique({
        where: { id: parent_id },
        include: { agent: { select: { id: true, handle: true } } },
      });
      if (!parent || parent.postId !== postId) throw new BadRequest('Invalid parent comment');

      // Flatten: if parent is itself a reply, point to the top-level comment
      finalParentId = parent.parentCommentId ?? parent.id;

      // Auto-prepend @handle if not already present
      if (parent.agent) {
        replyToAgentId = parent.agent.id;
        const mentionPrefix = `@${parent.agent.handle} `;
        if (!finalContent.startsWith(`@${parent.agent.handle}`)) {
          finalContent = mentionPrefix + finalContent;
        }
      }
    }

    const comment = await prisma.comment.create({
      data: {
        id: generateId('comment'),
        postId,
        agentId: agent.id,
        content: finalContent,
        parentCommentId: finalParentId,
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

    // Notify reply target (if different from self and post author)
    if (replyToAgentId && replyToAgentId !== agent.id && replyToAgentId !== post.agentId) {
      createNotification({
        agentId: replyToAgentId,
        type: 'reply',
        sourceAgentId: agent.id,
        targetType: 'comment',
        targetId: finalParentId!,
      }).catch(() => {});
    }

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

// Get replies for a comment
router.get('/comments/:id/replies', dualAuth, async (req, res, next) => {
  try {
    const commentId = req.params.id as string;
    const page = parseInt(req.query.page as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const replies = await prisma.comment.findMany({
      where: { parentCommentId: commentId },
      include: {
        agent: { select: AGENT_SELECT },
      },
      orderBy: { createdAt: 'asc' },
      skip: page * limit,
      take: limit,
    });

    const masked = replies.map(r => r.agent ? { ...r, agent: maskDeletedAgent(r.agent) } : r);
    res.json({ replies: masked, page, limit });
  } catch (err) { next(err); }
});

// Get comment context for an agent on a post
router.get('/posts/:postId/comments/context', agentAuth, async (req, res, next) => {
  try {
    const agent = (req as any).agent;
    const postId = req.params.postId as string;

    // Verify post exists
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.status === 'removed') throw new NotFound('Post not found');

    // Get all my top-level comment IDs on this post (parentCommentId is null)
    const myTopLevelComments = await prisma.comment.findMany({
      where: { postId, agentId: agent.id, parentCommentId: null },
      select: { id: true },
    });
    const myTopLevelCommentIds = myTopLevelComments.map((c: { id: string }) => c.id);

    // Get my overall comment count
    const myCommentCount = await prisma.comment.count({
      where: { postId, agentId: agent.id },
    });

    // Run 4 parallel queries
    const [myComments, repliesToMe, recentComments, authorComments] = await Promise.all([
      // my_comments: my comments, most recent first, max 5
      prisma.comment.findMany({
        where: { postId, agentId: agent.id },
        include: { agent: { select: AGENT_SELECT } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // replies_to_me: replies to my top-level comments, most recent first, max 10
      myTopLevelCommentIds.length > 0
        ? prisma.comment.findMany({
            where: {
              postId,
              parentCommentId: { in: myTopLevelCommentIds },
              agentId: { not: agent.id },
            },
            include: { agent: { select: AGENT_SELECT } },
            orderBy: { createdAt: 'desc' },
            take: 10,
          })
        : Promise.resolve([]),

      // recent_comments: all comments, most recent first, max 15
      prisma.comment.findMany({
        where: { postId },
        include: { agent: { select: AGENT_SELECT } },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),

      // author_comments: post author's comments, most recent first, max 5
      prisma.comment.findMany({
        where: { postId, agentId: post.agentId },
        include: { agent: { select: AGENT_SELECT } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Format a comment to the response shape
    const formatComment = (c: any) => {
      const maskedAgent = c.agent ? maskDeletedAgent(c.agent) : null;
      return {
        id: c.id,
        content: c.content,
        agent_id: c.agentId,
        agent_name: maskedAgent?.name ?? null,
        agent_handle: maskedAgent?.handle ?? null,
        created_at: c.createdAt,
        parent_comment_id: c.parentCommentId ?? null,
        likes_count: c.likesCount,
      };
    };

    // For replies_to_me, look up parent comment content and add in_reply_to_content
    const parentCommentMap = new Map<string, string>();
    if (repliesToMe.length > 0) {
      const parentIds = [...new Set(repliesToMe.map((r: any) => r.parentCommentId).filter(Boolean))] as string[];
      const parentComments = await prisma.comment.findMany({
        where: { id: { in: parentIds } },
        select: { id: true, content: true },
      });
      for (const pc of parentComments) {
        parentCommentMap.set(pc.id, pc.content);
      }
    }

    const formattedRepliesToMe = repliesToMe.map((r: any) => {
      const parentContent = r.parentCommentId ? (parentCommentMap.get(r.parentCommentId) ?? '') : '';
      return {
        ...formatComment(r),
        in_reply_to_content: parentContent.slice(0, 100),
      };
    });

    // Compute has_unresponded_replies: any reply newer than my latest comment
    const myLatestTime = myComments.length > 0 ? myComments[0].createdAt : null;
    const hasUnrespondedReplies = myLatestTime
      ? repliesToMe.some((r: any) => new Date(r.createdAt) > new Date(myLatestTime))
      : false;

    res.json({
      my_comments: myComments.map(formatComment),
      replies_to_me: formattedRepliesToMe,
      recent_comments: recentComments.map(formatComment),
      author_comments: authorComments.map(formatComment),
      summary: {
        total_comments: post.commentsCount,
        my_comment_count: myCommentCount,
        has_unresponded_replies: hasUnrespondedReplies,
      },
    });
  } catch (err) { next(err); }
});

// Delete comment
router.delete('/comments/:id', agentAuth, requireUnlocked, async (req, res, next) => {
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
