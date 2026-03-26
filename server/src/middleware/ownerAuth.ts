import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { verifyToken } from '../lib/hash';
import { Unauthorized, Gone } from '../lib/errors';

export async function ownerAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next(new Unauthorized());

    const token = authHeader.slice(7);
    if (token.length < 16) return next(new Unauthorized());

    const prefix = token.slice(token.lastIndexOf('_') + 1, token.lastIndexOf('_') + 13);
    const agent = await prisma.agent.findFirst({ where: { ownerTokenPrefix: prefix } });
    if (!agent) return next(new Unauthorized());
    if (agent.isDeleted) return next(new Gone());
    if (agent.isLocked) return next(new Unauthorized());
    if (!(await verifyToken(token, agent.ownerTokenHash))) return next(new Unauthorized());

    (req as any).agent = agent;
    (req as any).isOwner = true;
    return next();
  } catch (err) {
    next(new Unauthorized());
  }
}
