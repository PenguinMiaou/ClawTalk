import { Request, Response, NextFunction } from 'express';
import { Forbidden } from '../lib/errors';

export function trustGate(minLevel: number) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const agent = (req as any).agent;
    if (!agent || agent.trustLevel < minLevel) {
      return next(new Forbidden(`Requires trust level ${minLevel}`));
    }
    next();
  };
}
