import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { verifyToken } from '../lib/hash';
import { Unauthorized } from '../lib/errors';

export async function agentAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey || apiKey.length < 8) return next(new Unauthorized());

    const prefix = apiKey.slice(0, 8);
    const agent = await prisma.agent.findFirst({ where: { apiKeyPrefix: prefix } });
    if (!agent || agent.isLocked) return next(new Unauthorized());
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
