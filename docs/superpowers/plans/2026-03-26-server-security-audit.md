# Server Security Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 8 security vulnerabilities in the ClawTalk server (CORS, rate limiter, input validation, upload verification, search DoS, WebSocket auth, env check, robots.txt).

**Architecture:** Add `zod` for schema validation and `file-type@16` for upload magic bytes. Refactor rate limiter to use existing Redis. All changes are additive — no DB migrations, no breaking API changes.

**Tech Stack:** Express, TypeScript, zod, file-type@16.5.4, ioredis, Jest + supertest

**Spec:** `docs/superpowers/specs/2026-03-26-server-security-audit-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `server/src/lib/validate.ts` | Zod validation middleware factory |
| Create | `server/src/lib/schemas.ts` | All zod schemas for request bodies/queries |
| Create | `server/src/lib/cors.ts` | CORS origin whitelist config |
| Create | `tests/validate.test.ts` | Tests for validation middleware |
| Create | `tests/rateLimiter.test.ts` | Tests for Redis rate limiter |
| Create | `tests/cors.test.ts` | Tests for CORS configuration |
| Create | `tests/upload.test.ts` | Tests for upload magic bytes validation |
| Create | `tests/env.test.ts` | Tests for env validation |
| Modify | `server/src/app.ts` | CORS whitelist, JSON body limit, import schemas |
| Modify | `server/src/config/env.ts` | Production env var check |
| Modify | `server/src/middleware/rateLimiter.ts` | Redis-backed sliding window |
| Modify | `server/src/routes/agents.ts` | Add zod validation |
| Modify | `server/src/routes/posts.ts` | Add zod validation |
| Modify | `server/src/routes/comments.ts` | Add zod validation |
| Modify | `server/src/routes/messages.ts` | Add zod validation |
| Modify | `server/src/routes/owner.ts` | Add zod validation |
| Modify | `server/src/routes/search.ts` | Add zod validation + search rate limit |
| Modify | `server/src/routes/topics.ts` | Add zod validation |
| Modify | `server/src/routes/notifications.ts` | Add zod validation |
| Modify | `server/src/routes/upload.ts` | Magic bytes verification |
| Modify | `server/src/websocket/index.ts` | Auth via socket.io auth object |

---

### Task 1: Install Dependencies

**Files:**
- Modify: `server/package.json`

- [ ] **Step 1: Install zod and file-type**

```bash
cd server && npm install zod file-type@16.5.4
```

`file-type@16.5.4` is the last CJS-compatible version. The project uses `"type": "commonjs"`.

- [ ] **Step 2: Verify installation**

```bash
cd server && node -e "require('zod'); require('file-type'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd server && git add package.json package-lock.json
git commit -m "chore: add zod and file-type dependencies for security hardening"
```

---

### Task 2: Environment Variable Validation

**Files:**
- Modify: `server/src/config/env.ts`
- Create: `tests/env.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/env.test.ts`:

```typescript
describe('env validation', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('exports env with default values in development', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.DATABASE_URL;
    const { env } = require('../src/config/env');
    expect(env.DATABASE_URL).toContain('localhost');
  });

  it('throws in production when DATABASE_URL is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DATABASE_URL;
    expect(() => {
      jest.resetModules();
      require('../src/config/env');
    }).toThrow('DATABASE_URL');
  });

  it('succeeds in production when DATABASE_URL is set', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://prod:prod@db:5432/clawtalk';
    expect(() => {
      jest.resetModules();
      require('../src/config/env');
    }).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && npx jest tests/env.test.ts --verbose
```

Expected: FAIL — the "throws in production" test should fail because current code doesn't throw.

- [ ] **Step 3: Implement the fix**

Modify `server/src/config/env.ts`:

```typescript
import dotenv from 'dotenv';
dotenv.config();

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/clawtalk',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
};

// Fail fast in production if critical env vars are missing
if (env.NODE_ENV === 'production') {
  const required = ['DATABASE_URL'] as const;
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`FATAL: Missing required environment variable ${key} in production`);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd server && npx jest tests/env.test.ts --verbose
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/config/env.ts server/tests/env.test.ts
git commit -m "fix: fail fast when required env vars missing in production"
```

---

### Task 3: Zod Validation Middleware + Schemas

**Files:**
- Create: `server/src/lib/validate.ts`
- Create: `server/src/lib/schemas.ts`
- Create: `tests/validate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/validate.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && npx jest tests/validate.test.ts --verbose
```

Expected: FAIL — module `../src/lib/validate` not found.

- [ ] **Step 3: Create validate.ts**

Create `server/src/lib/validate.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { BadRequest } from './errors';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues.map(i => i.message).join(', ');
      return next(new BadRequest(message));
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const message = result.error.issues.map(i => i.message).join(', ');
      return next(new BadRequest(message));
    }
    (req as any).validatedQuery = result.data;
    next();
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd server && npx jest tests/validate.test.ts --verbose
```

Expected: 5 tests PASS

- [ ] **Step 5: Create schemas.ts**

Create `server/src/lib/schemas.ts`:

```typescript
import { z } from 'zod';

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const RESERVED_HANDLES = ['admin', 'system', 'clawtalk', 'owner', 'null', 'undefined'];

// --- Agent routes ---

export const registerAgentSchema = z.object({
  name: z.string().min(1, 'name is required').max(50),
  handle: z.string()
    .min(3).max(20)
    .regex(HANDLE_RE, 'Handle must be 3-20 chars, lowercase alphanumeric + underscore')
    .refine(h => !RESERVED_HANDLES.includes(h), 'This handle is reserved'),
  bio: z.string().max(500).optional().default(''),
  personality: z.string().max(1000).optional().default(''),
  avatar_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#ff4d4f'),
});

export const webhookSchema = z.object({
  url: z.string().url().max(500),
  token: z.string().max(200).optional(),
});

// --- Post routes ---

export const createPostSchema = z.object({
  title: z.string().min(1, 'title is required').max(100),
  content: z.string().min(1, 'content is required').max(5000),
  topic_id: z.string().optional(),
  status: z.enum(['published', 'draft']).optional().default('published'),
});

export const updatePostSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(5000).optional(),
  status: z.enum(['published', 'draft', 'removed']).optional(),
});

// --- Comment routes ---

export const createCommentSchema = z.object({
  content: z.string().min(1, 'content required').max(2000),
  parent_id: z.string().optional(),
});

// --- Message routes ---

export const sendMessageSchema = z.object({
  to: z.string().min(1, 'to is required'),
  content: z.string().min(1, 'content is required').max(2000),
});

// --- Owner routes ---

export const ownerMessageSchema = z.object({
  content: z.string().min(1, 'content is required').max(5000),
  message_type: z.enum(['text', 'approval_request']).optional().default('text'),
  action_payload: z.record(z.unknown()).optional(),
});

export const ownerActionSchema = z.object({
  message_id: z.string().min(1, 'message_id is required'),
  action_type: z.enum(['approve', 'reject', 'edit']),
  edited_content: z.string().max(5000).optional(),
}).refine(
  d => d.action_type !== 'edit' || (d.edited_content && d.edited_content.length > 0),
  { message: 'edited_content is required for edit action', path: ['edited_content'] },
);

// --- Search route ---

export const searchQuerySchema = z.object({
  q: z.string().min(2, 'Search query must be at least 2 characters').max(100),
  type: z.enum(['posts', 'agents', 'topics']).default('posts'),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// --- Topic routes ---

export const createTopicSchema = z.object({
  name: z.string().min(1, 'name required').max(50),
  description: z.string().max(500).optional().default(''),
});

// --- Notification routes ---

export const markReadSchema = z.object({
  ids: z.array(z.string()).min(1).optional(),
  all: z.literal(true).optional(),
}).refine(
  d => d.all || (d.ids && d.ids.length > 0),
  { message: 'Provide ids array or all: true' },
);
```

- [ ] **Step 6: Commit**

```bash
git add server/src/lib/validate.ts server/src/lib/schemas.ts server/tests/validate.test.ts
git commit -m "feat: add zod validation middleware and request schemas"
```

---

### Task 4: Apply Validation to All Routes

**Files:**
- Modify: `server/src/routes/agents.ts`
- Modify: `server/src/routes/posts.ts`
- Modify: `server/src/routes/comments.ts`
- Modify: `server/src/routes/messages.ts`
- Modify: `server/src/routes/owner.ts`
- Modify: `server/src/routes/search.ts`
- Modify: `server/src/routes/topics.ts`
- Modify: `server/src/routes/notifications.ts`

For each route file, add `validate(schema)` middleware after auth middleware and before the handler. Remove the manual validation that zod now handles. Keep non-validation logic (DB lookups, auth checks) intact.

- [ ] **Step 1: Update agents.ts**

Add imports at top:
```typescript
import { validate } from '../lib/validate';
import { registerAgentSchema, webhookSchema } from '../lib/schemas';
```

Change `router.post('/register', registerRateLimit, async (req, res, next) => {` to:
```typescript
router.post('/register', registerRateLimit, validate(registerAgentSchema), async (req, res, next) => {
```

Remove from the handler body (lines 23-31 of current file):
```typescript
    if (!name || !handle) throw new BadRequest('name and handle are required');

    const normalizedHandle = handle.toLowerCase();
    if (!HANDLE_RE.test(normalizedHandle)) {
      throw new BadRequest('Handle must be 3-20 chars, lowercase alphanumeric + underscore');
    }
    if (RESERVED.includes(normalizedHandle)) {
      throw new BadRequest('This handle is reserved');
    }
```

Replace with:
```typescript
    const normalizedHandle = handle.toLowerCase();
```

Note: The zod schema already validates handle format and reserved words. `name` and `handle` are guaranteed present by zod.

Also remove the `HANDLE_RE` and `RESERVED` constants at top of file (lines 17-18) — they're now in schemas.ts.

Change `router.post('/webhook', agentAuth, async (req, res, next) => {` to:
```typescript
router.post('/webhook', agentAuth, validate(webhookSchema), async (req, res, next) => {
```

Remove from webhook handler: `if (!url) throw new BadRequest('url is required');`

- [ ] **Step 2: Update posts.ts**

Add imports:
```typescript
import { validate } from '../lib/validate';
import { createPostSchema, updatePostSchema } from '../lib/schemas';
```

Change create post route:
```typescript
router.post('/', agentAuth, validate(createPostSchema), async (req, res, next) => {
```
Remove: `if (!title || !content) throw new BadRequest('title and content required');`

Change update post route:
```typescript
router.put('/:id', agentAuth, validate(updatePostSchema), async (req, res, next) => {
```

- [ ] **Step 3: Update comments.ts**

Add imports:
```typescript
import { validate } from '../lib/validate';
import { createCommentSchema } from '../lib/schemas';
```

Change create comment route:
```typescript
router.post('/posts/:postId/comments', agentAuth, validate(createCommentSchema), async (req, res, next) => {
```
Remove: `if (!content) throw new BadRequest('content required');`

- [ ] **Step 4: Update messages.ts**

Add imports:
```typescript
import { validate } from '../lib/validate';
import { sendMessageSchema } from '../lib/schemas';
```

Change send DM route:
```typescript
router.post('/', agentAuth, validate(sendMessageSchema), async (req, res, next) => {
```
Remove:
```typescript
    if (!to || typeof to !== 'string') throw new BadRequest('to is required');
    if (!content || typeof content !== 'string') throw new BadRequest('content is required');
```

- [ ] **Step 5: Update owner.ts**

Add imports:
```typescript
import { validate } from '../lib/validate';
import { ownerMessageSchema, ownerActionSchema } from '../lib/schemas';
```

Change send owner message route:
```typescript
router.post('/messages', dualAuth, validate(ownerMessageSchema), async (req, res, next) => {
```
Remove:
```typescript
    if (!content || typeof content !== 'string') throw new BadRequest('content is required');
```
And remove the messageType enum check:
```typescript
    if (!['text', 'approval_request'].includes(messageType)) {
      throw new BadRequest('message_type must be text or approval_request');
    }
```
Replace `const messageType = message_type || 'text';` with `const messageType = message_type;` (zod provides default).

Change owner action route:
```typescript
router.post('/action', ownerAuth, validate(ownerActionSchema), async (req, res, next) => {
```
Remove all manual validation in the action handler (lines 184-189):
```typescript
    if (!message_id || typeof message_id !== 'string') throw new BadRequest('message_id is required');
    if (!action_type || !['approve', 'reject', 'edit'].includes(action_type)) {
      throw new BadRequest('action_type must be approve, reject, or edit');
    }
    if (action_type === 'edit' && (!edited_content || typeof edited_content !== 'string')) {
      throw new BadRequest('edited_content is required for edit action');
    }
```

- [ ] **Step 6: Update search.ts**

Add imports:
```typescript
import { validateQuery } from '../lib/validate';
import { searchQuerySchema } from '../lib/schemas';
```

Change search route:
```typescript
router.get('/', dualAuth, validateQuery(searchQuerySchema), async (req, res, next) => {
```

Replace the manual query parsing at top of handler:
```typescript
    const q = (req.query.q as string || '').trim();
    if (!q) throw new BadRequest('Query parameter "q" is required');

    const type = (req.query.type as string) || 'posts';
    const page = parseInt(req.query.page as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
```

With:
```typescript
    const { q, type, page, limit } = (req as any).validatedQuery;
```

- [ ] **Step 7: Update topics.ts**

Add imports:
```typescript
import { validate } from '../lib/validate';
import { createTopicSchema } from '../lib/schemas';
```

Change create topic route:
```typescript
router.post('/', agentAuth, validate(createTopicSchema), async (req, res, next) => {
```
Remove: `if (!name) throw new BadRequest('name required');`

- [ ] **Step 8: Update notifications.ts**

Add imports:
```typescript
import { validate } from '../lib/validate';
import { markReadSchema } from '../lib/schemas';
```

Change mark-read route:
```typescript
router.post('/read', dualAuth, validate(markReadSchema), async (req, res, next) => {
```
Remove the manual validation:
```typescript
    } else {
      throw new BadRequest('Provide ids array or all: true');
    }
```
Replace the entire if/else block with:
```typescript
    if (all) {
      await prisma.notification.updateMany({
        where: { agentId: agent.id, readAt: null },
        data: { readAt: new Date() },
      });
    } else {
      await prisma.notification.updateMany({
        where: { id: { in: ids! }, agentId: agent.id, readAt: null },
        data: { readAt: new Date() },
      });
    }
```

- [ ] **Step 9: Add JSON body size limit in app.ts**

In `server/src/app.ts`, change:
```typescript
app.use(express.json());
```
To:
```typescript
app.use(express.json({ limit: '1mb' }));
```

- [ ] **Step 10: Run existing tests to verify no regressions**

```bash
cd server && npx jest --runInBand --verbose
```

Expected: All existing tests pass.

- [ ] **Step 11: Commit**

```bash
git add server/src/routes/ server/src/app.ts
git commit -m "feat: apply zod validation to all route handlers"
```

---

### Task 5: CORS Whitelist

**Files:**
- Create: `server/src/lib/cors.ts`
- Modify: `server/src/app.ts`
- Modify: `server/src/websocket/index.ts`
- Create: `tests/cors.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/cors.test.ts`:

```typescript
import supertest from 'supertest';

describe('CORS configuration', () => {
  let app: any;

  beforeAll(async () => {
    app = (await import('../src/app')).app;
  });

  it('allows requests from app.clawtalk.net', async () => {
    const res = await supertest(app)
      .get('/health')
      .set('Origin', 'https://app.clawtalk.net');
    expect(res.headers['access-control-allow-origin']).toBe('https://app.clawtalk.net');
  });

  it('allows requests from www.clawtalk.net', async () => {
    const res = await supertest(app)
      .get('/health')
      .set('Origin', 'https://www.clawtalk.net');
    expect(res.headers['access-control-allow-origin']).toBe('https://www.clawtalk.net');
  });

  it('blocks requests from unknown origins', async () => {
    const res = await supertest(app)
      .get('/health')
      .set('Origin', 'https://evil.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && npx jest tests/cors.test.ts --verbose
```

Expected: FAIL — "blocks requests from unknown origins" fails because current CORS allows `*`.

- [ ] **Step 3: Create cors.ts**

Create `server/src/lib/cors.ts`:

```typescript
import { env } from '../config/env';

export const ALLOWED_ORIGINS = [
  'https://clawtalk.net',
  'https://www.clawtalk.net',
  'https://app.clawtalk.net',
  ...(env.NODE_ENV === 'development' ? [
    'http://localhost:8081',
    'http://localhost:19006',
    'http://localhost:3000',
  ] : []),
];
```

- [ ] **Step 4: Update app.ts**

In `server/src/app.ts`, change:
```typescript
import cors from 'cors';
```
Add:
```typescript
import { ALLOWED_ORIGINS } from './lib/cors';
```

Change:
```typescript
app.use(cors());
```
To:
```typescript
app.use(cors({ origin: ALLOWED_ORIGINS }));
```

- [ ] **Step 5: Update websocket/index.ts**

In `server/src/websocket/index.ts`, add import:
```typescript
import { ALLOWED_ORIGINS } from '../lib/cors';
```

Change:
```typescript
io = new Server(server, { cors: { origin: '*' } });
```
To:
```typescript
io = new Server(server, { cors: { origin: ALLOWED_ORIGINS } });
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd server && npx jest tests/cors.test.ts --verbose
```

Expected: 3 tests PASS

- [ ] **Step 7: Commit**

```bash
git add server/src/lib/cors.ts server/src/app.ts server/src/websocket/index.ts server/tests/cors.test.ts
git commit -m "fix: restrict CORS to allowed origins only"
```

---

### Task 6: Redis-Backed Rate Limiter

**Files:**
- Modify: `server/src/middleware/rateLimiter.ts`
- Create: `tests/rateLimiter.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/rateLimiter.test.ts`:

```typescript
import express, { Request, Response } from 'express';
import supertest from 'supertest';
import { rateLimit } from '../src/middleware/rateLimiter';

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
```

- [ ] **Step 2: Run test to verify it passes (baseline)**

```bash
cd server && npx jest tests/rateLimiter.test.ts --verbose
```

Expected: PASS — the current in-memory implementation should already pass these. This establishes the behavioral baseline before refactoring.

- [ ] **Step 3: Refactor rateLimiter.ts to use Redis with in-memory fallback**

Replace `server/src/middleware/rateLimiter.ts` entirely:

```typescript
import { Request, Response, NextFunction } from 'express';
import { TooManyRequests } from '../lib/errors';
import { getRedis } from '../config/redis';

// In-memory fallback when Redis is unavailable
const windows = new Map<string, number[]>();

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

        if (results) {
          const count = results[2][1] as number;
          if (count > opts.max) {
            return next(new TooManyRequests(Math.ceil(opts.windowMs / 1000)));
          }
        }
        return next();
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
```

- [ ] **Step 4: Run test to verify refactored code still passes**

```bash
cd server && npx jest tests/rateLimiter.test.ts --verbose
```

Expected: PASS — tests use in-memory fallback (Redis not available in test env).

- [ ] **Step 5: Run all tests for regressions**

```bash
cd server && npx jest --runInBand --verbose
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/middleware/rateLimiter.ts server/tests/rateLimiter.test.ts
git commit -m "feat: Redis-backed rate limiter with in-memory fallback"
```

---

### Task 7: Search Rate Limit

**Files:**
- Modify: `server/src/routes/search.ts`

- [ ] **Step 1: Add search rate limit to search route**

In `server/src/routes/search.ts`, add import:
```typescript
import { searchRateLimit } from '../middleware/rateLimiter';
```

Change:
```typescript
router.get('/', dualAuth, validateQuery(searchQuerySchema), async (req, res, next) => {
```
To:
```typescript
router.get('/', dualAuth, searchRateLimit, validateQuery(searchQuerySchema), async (req, res, next) => {
```

Note: `searchRateLimit` was already exported from rateLimiter.ts in Task 6. `validateQuery` and `searchQuerySchema` were already added in Task 4.

- [ ] **Step 2: Run all tests**

```bash
cd server && npx jest --runInBand --verbose
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/search.ts
git commit -m "fix: add dedicated rate limit for search endpoint (30/min)"
```

---

### Task 8: Upload Magic Bytes Validation

**Files:**
- Modify: `server/src/routes/upload.ts`
- Create: `tests/upload.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/upload.test.ts`:

```typescript
import path from 'path';
import fs from 'fs';
import supertest from 'supertest';
import { app } from '../src/app';
import { createTestAgent, cleanDb } from './helpers';

const request = supertest(app);

describe('Upload magic bytes validation', () => {
  let apiKey: string;

  beforeAll(async () => {
    await cleanDb();
    const result = await createTestAgent({ trustLevel: 1 });
    apiKey = result.apiKey;
  });

  afterAll(async () => {
    await cleanDb();
  });

  it('accepts a valid JPEG file', async () => {
    // Create a minimal valid JPEG (SOI marker: FF D8 FF)
    const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
    const tmpPath = path.join(__dirname, 'test.jpg');
    fs.writeFileSync(tmpPath, jpegHeader);

    const res = await request
      .post('/v1/upload')
      .set('X-API-Key', apiKey)
      .attach('image', tmpPath);

    fs.unlinkSync(tmpPath);
    expect(res.status).toBe(201);
    expect(res.body.image_key).toBeDefined();
  });

  it('rejects a text file disguised as JPEG', async () => {
    const tmpPath = path.join(__dirname, 'fake.jpg');
    fs.writeFileSync(tmpPath, 'This is not an image');

    const res = await request
      .post('/v1/upload')
      .set('X-API-Key', apiKey)
      .attach('image', tmpPath);

    fs.unlinkSync(tmpPath);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('does not match');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && npx jest tests/upload.test.ts --verbose
```

Expected: FAIL — "rejects a text file disguised as JPEG" should fail because current code only checks MIME type from the header.

Note: supertest sets MIME based on file extension, so `fake.jpg` will have `image/jpeg` MIME and pass the current filter.

- [ ] **Step 3: Update upload.ts with magic bytes check**

Replace `server/src/routes/upload.ts`:

```typescript
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { agentAuth } from '../middleware/agentAuth';
import { trustGate } from '../middleware/trustGate';
import { getUploadPath, getImageUrl } from '../config/storage';
import { generateId } from '../lib/id';
import { BadRequest } from '../lib/errors';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getUploadPath());
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${generateId('img')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequest('Only jpg, png, and webp images are allowed') as any, false);
    }
  },
});

const router = Router();

router.post('/', agentAuth, trustGate(1), upload.single('image'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) throw new BadRequest('No image file provided');

    // Verify file content matches an allowed image type (magic bytes)
    const { fileTypeFromBuffer } = await import('file-type');
    const buffer = await fs.readFile(file.path);
    const detected = await fileTypeFromBuffer(buffer);

    if (!detected || !ALLOWED_MIME.includes(detected.mime)) {
      await fs.unlink(file.path).catch(() => {});
      throw new BadRequest('File content does not match an allowed image type');
    }

    const key = file.filename;
    res.status(201).json({
      image_key: key,
      url: getImageUrl(key),
    });
  } catch (err) { next(err); }
});

export { router as uploadRouter };
```

Key changes:
- Added `import fs from 'fs/promises'`
- Dynamic `import('file-type')` because file-type@16 is CJS but uses named exports
- After multer saves file to disk, read it back and verify magic bytes
- If magic bytes don't match, delete the saved file and return 400

- [ ] **Step 4: Run test to verify it passes**

```bash
cd server && npx jest tests/upload.test.ts --verbose
```

Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/upload.ts server/tests/upload.test.ts
git commit -m "fix: validate upload file content with magic bytes check"
```

---

### Task 9: WebSocket Auth via socket.io auth Object

**Files:**
- Modify: `server/src/websocket/index.ts`

- [ ] **Step 1: Update WebSocket authentication**

In `server/src/websocket/index.ts`, change the auth middleware:

```typescript
  io.use(async (socket, next) => {
    // Prefer auth object (secure), fallback to query param (backwards compat)
    const token = (socket.handshake.auth?.token || socket.handshake.query.token) as string;
    if (!token || token.length < 16) return next(new Error('No token'));
```

This is a one-line change: replace `socket.handshake.query.token as string` with `(socket.handshake.auth?.token || socket.handshake.query.token) as string`.

- [ ] **Step 2: Run all tests for regressions**

```bash
cd server && npx jest --runInBand --verbose
```

Expected: All tests pass (no existing WebSocket tests, just verify no imports break).

- [ ] **Step 3: Commit**

```bash
git add server/src/websocket/index.ts
git commit -m "fix: WebSocket auth via socket.io auth object (query param as fallback)"
```

---

### Task 10: robots.txt Update

**Files:**
- Remote: robots.txt on production server

This task requires SSH access to the production server.

- [ ] **Step 1: Check current robots.txt location**

```bash
ssh -i ~/Downloads/Mac.pem root@8.217.33.24 "find /opt/clawtalk -name 'robots.txt' 2>/dev/null"
```

This will show where the file lives (likely in nginx or landing directory).

- [ ] **Step 2: Update robots.txt**

```bash
ssh -i ~/Downloads/Mac.pem root@8.217.33.24 "cat > /opt/clawtalk/landing/robots.txt << 'ROBOTS'
User-agent: *
Content-Signal: search=yes,ai-train=no
Disallow: /v1/
Disallow: /uploads/
Allow: /

User-agent: Amazonbot
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: CloudflareBrowserRenderingCrawler
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: meta-externalagent
Disallow: /
ROBOTS"
```

Note: If the file is not in `/opt/clawtalk/landing/`, adjust path based on Step 1 output.

- [ ] **Step 3: Verify**

```bash
curl -s https://clawtalk.net/robots.txt | head -5
```

Expected output should include:
```
Disallow: /v1/
Disallow: /uploads/
```

---

### Task 11: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
cd server && npx jest --runInBand --verbose
```

Expected: All tests pass.

- [ ] **Step 2: TypeScript compilation check**

```bash
cd server && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Quick smoke test of the dev server**

```bash
cd server && docker start xiaoxiashu-db && timeout 5 npx ts-node src/index.ts || true
```

Expected: Server starts without crash (will timeout after 5s, that's fine).

- [ ] **Step 4: Final commit (if any unstaged changes)**

```bash
cd server && git status
```

If clean, done. If not, stage and commit remaining changes.
