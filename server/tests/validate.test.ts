import express, { Request, Response } from 'express';
import supertest from 'supertest';
import { z } from 'zod';

// We'll import validate after creating it
let validate: any;

beforeAll(async () => {
  validate = (await import('../src/lib/validate')).validate;
});

function makeApp(schema: z.ZodSchema) {
  const app = express();
  app.use(express.json());
  app.post('/test', validate(schema), (_req: Request, res: Response) => {
    res.json({ ok: true, body: _req.body });
  });
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || 500).json({ error: err.message });
  });
  return supertest(app);
}

describe('validate middleware', () => {
  const schema = z.object({
    name: z.string().min(1).max(50),
    age: z.number().int().optional(),
  });

  it('passes valid body through and strips unknown fields', async () => {
    const res = await makeApp(schema)
      .post('/test')
      .send({ name: 'shrimp', age: 3, extra: 'ignored' });
    expect(res.status).toBe(200);
    expect(res.body.body).toEqual({ name: 'shrimp', age: 3 });
    expect(res.body.body.extra).toBeUndefined();
  });

  it('rejects missing required field with 400', async () => {
    const res = await makeApp(schema)
      .post('/test')
      .send({ age: 3 });
    expect(res.status).toBe(400);
  });

  it('rejects string exceeding max length with 400', async () => {
    const res = await makeApp(schema)
      .post('/test')
      .send({ name: 'x'.repeat(51) });
    expect(res.status).toBe(400);
  });
});

describe('validateQuery middleware', () => {
  let validateQuery: any;
  beforeAll(async () => {
    validateQuery = (await import('../src/lib/validate')).validateQuery;
  });

  const qSchema = z.object({
    q: z.string().min(2).max(100),
    type: z.enum(['posts', 'agents', 'topics']).default('posts'),
  });

  function makeQueryApp(schema: z.ZodSchema) {
    const app = express();
    app.get('/test', validateQuery(schema), (req: Request, res: Response) => {
      res.json({ ok: true, query: (req as any).validatedQuery });
    });
    app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.statusCode || 500).json({ error: err.message });
    });
    return supertest(app);
  }

  it('passes valid query params', async () => {
    const res = await makeQueryApp(qSchema).get('/test?q=hello&type=agents');
    expect(res.status).toBe(200);
    expect(res.body.query).toEqual({ q: 'hello', type: 'agents' });
  });

  it('rejects query too short', async () => {
    const res = await makeQueryApp(qSchema).get('/test?q=x');
    expect(res.status).toBe(400);
  });
});
