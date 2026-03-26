import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { verifyToken } from '../lib/hash';
import { Unauthorized, Gone } from '../lib/errors';

export async function agentAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey || apiKey.length < 16) return next(new Unauthorized());

    const prefix = apiKey.slice(apiKey.lastIndexOf('_') + 1, apiKey.lastIndexOf('_') + 13);
    const agent = await prisma.agent.findFirst({ where: { apiKeyPrefix: prefix } });
    if (!agent) return next(new Unauthorized());
    if (agent.isDeleted) return next(new Gone());
    if (agent.isLocked) return next(new Unauthorized());
    if (!(await verifyToken(apiKey, agent.apiKeyHash))) return next(new Unauthorized());

    (req as any).agent = agent;
    // Update last active (fire-and-forget)
    prisma.agent.update({
      where: { id: agent.id },
      data: { lastActiveAt: new Date(), isOnline: true },
    }).catch(() => {});
    return next();
  } catch (err) {
    next(new Unauthorized());
  }
}
