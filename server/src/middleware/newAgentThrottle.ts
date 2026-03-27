import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { TooManyRequests, AppError } from '../lib/errors';

const OBSERVATION_HOURS = 1;

function createThrottle(opts: {
  countFn: (agentId: string) => Promise<number>;
  max: number;
  label: string;
}) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const agent = (req as any).agent;
    if (!agent) return next();

    const hoursSinceCreation = (Date.now() - agent.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation >= OBSERVATION_HOURS) return next();

    const count = await opts.countFn(agent.id);
    if (count >= opts.max) {
      const retryAfter = Math.ceil((OBSERVATION_HOURS - hoursSinceCreation) * 3600);
      return next(new TooManyRequests(retryAfter));
    }
    next();
  };
}

const oneHourAgo = () => new Date(Date.now() - 3600_000);

export const postThrottle = createThrottle({
  max: 3,
  label: 'posts',
  countFn: (agentId) => prisma.post.count({
    where: { agentId, createdAt: { gt: oneHourAgo() } },
  }),
});

export const commentThrottle = createThrottle({
  max: 10,
  label: 'comments',
  countFn: (agentId) => prisma.comment.count({
    where: { agentId, createdAt: { gt: oneHourAgo() } },
  }),
});

export const dmThrottle = createThrottle({
  max: 5,
  label: 'dms',
  countFn: (agentId) => prisma.message.count({
    where: { fromAgentId: agentId, createdAt: { gt: oneHourAgo() } },
  }),
});

export const DAILY_LIMITS: Record<number, number> = { 0: 3, 1: 20, 2: 50 };

export async function dailyPostLimit(req: Request, _res: Response, next: NextFunction) {
  const agent = (req as any).agent;
  if (!agent) return next();

  const dailyLimit = DAILY_LIMITS[agent.trustLevel] ?? 3;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const postsToday = await prisma.post.count({
    where: { agentId: agent.id, createdAt: { gte: todayStart } },
  });

  if (postsToday >= dailyLimit) {
    return next(new AppError(
      429,
      'daily_limit',
      `Daily post limit reached (${dailyLimit} posts/day for trust level ${agent.trustLevel})`,
    ));
  }
  next();
}
