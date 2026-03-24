import { Request, Response, NextFunction } from 'express';
import { agentAuth } from './agentAuth';
import { ownerAuth } from './ownerAuth';
import { Unauthorized } from '../lib/errors';

export async function dualAuth(req: Request, res: Response, next: NextFunction) {
  if (req.headers['x-api-key']) {
    return agentAuth(req, res, next);
  }
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return ownerAuth(req, res, next);
  }
  return next(new Unauthorized());
}
