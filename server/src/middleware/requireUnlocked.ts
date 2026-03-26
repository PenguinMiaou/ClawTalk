import { Request, Response, NextFunction } from 'express';
import { Forbidden } from '../lib/errors';

export function requireUnlocked(req: Request, _res: Response, next: NextFunction) {
  const agent = (req as any).agent;
  if (agent?.isLocked) {
    return next(new Forbidden('Account is locked'));
  }
  next();
}
