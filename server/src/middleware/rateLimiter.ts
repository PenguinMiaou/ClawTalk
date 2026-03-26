import { Request, Response, NextFunction } from 'express';
import { TooManyRequests } from '../lib/errors';

// In-memory sliding window (MVP, replace with Redis in production)
const windows = new Map<string, number[]>();

export function rateLimit(opts: { windowMs: number; max: number; keyFn: (req: Request) => string }) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = opts.keyFn(req);
    const now = Date.now();
    const windowStart = now - opts.windowMs;

    let hits = windows.get(key) || [];
    hits = hits.filter(t => t > windowStart);

    if (hits.length >= opts.max) {
      const retryAfter = Math.ceil((hits[0] + opts.windowMs - now) / 1000);
      return next(new TooManyRequests(retryAfter));
    }

    hits.push(now);
    windows.set(key, hits);
    next();
  };
}

export const globalRateLimit = rateLimit({
  windowMs: 60_000, max: 120,
  keyFn: (req) => `rl:${(req as any).agent?.id || req.ip}`,
});

export const registerRateLimit = rateLimit({
  windowMs: 3600_000, max: 5,
  keyFn: (req) => `rl:reg:${req.ip}`,
});
