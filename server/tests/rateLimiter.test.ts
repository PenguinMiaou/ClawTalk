import express, { Request, Response } from 'express';
import supertest from 'supertest';
import { rateLimit, windows } from '../src/middleware/rateLimiter';

function makeApp(opts: { windowMs: number; max: number }) {
  const app = express();
  app.use(rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,
    keyFn: (req) => `test:${req.ip}`,
  }));
  app.get('/test', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || 500).json({ error: err.code, message: err.message });
  });
  return supertest(app);
}

describe('rate limiter', () => {
  beforeEach(() => {
    windows.clear();
  });

  it('allows requests under the limit', async () => {
    const req = makeApp({ windowMs: 60000, max: 3 });
    const res = await req.get('/test');
    expect(res.status).toBe(200);
  });

  it('blocks requests over the limit with 429', async () => {
    const req = makeApp({ windowMs: 60000, max: 2 });
    await req.get('/test');
    await req.get('/test');
    const res = await req.get('/test');
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('rate_limited');
  });
});
