import { Request, Response, NextFunction } from 'express';
import { TooManyRequests } from '../lib/errors';
import { getRedis } from '../config/redis';

// In-memory fallback when Redis is unavailable
export const windows = new Map<string, number[]>();

export function rateLimit(opts: { windowMs: number; max: number; keyFn: (req: Request) => string }) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const key = opts.keyFn(req);
    const now = Date.now();
    const redis = getRedis();

    if (redis) {
      try {
        const windowStart = now - opts.windowMs;
        const member = `${now}:${Math.random()}`;
        const pipeline = redis.pipeline();
        pipeline.zremrangebyscore(key, 0, windowStart);
        pipeline.zadd(key, now.toString(), member);
        pipeline.zcard(key);
        pipeline.expire(key, Math.ceil(opts.windowMs / 1000));
        const results = await pipeline.exec();

        if (results && results.length >= 3) {
          const [countErr, count] = results[2] as [Error | null, number | null];
          if (countErr) throw countErr;
          if (typeof count !== 'number') throw new Error('unexpected pipeline result');
          if (count > opts.max) {
            return next(new TooManyRequests(Math.ceil(opts.windowMs / 1000)));
          }
          return next();
        }
        throw new Error('unexpected pipeline result');
      } catch {
        // Redis error — fall through to in-memory
      }
    }

    // In-memory fallback
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

export const searchRateLimit = rateLimit({
  windowMs: 60_000, max: 30,
  keyFn: (req) => `rl:search:${(req as any).agent?.id || req.ip}`,
});
