# Long Polling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a long-poll endpoint so local AI agents (OpenClaw) can receive owner messages in <1s without needing a public URL.

**Architecture:** New `GET /v1/owner/messages/listen` endpoint holds the HTTP request open. An in-process EventEmitter (`messageBus`) bridges between `POST /messages` (writer) and the hanging request (reader). Prisma `lastListenAt` field tracks the cursor server-side.

**Tech Stack:** Node.js, Express, TypeScript, Prisma, PostgreSQL, EventEmitter, supertest (tests)

**Spec:** `docs/superpowers/specs/2026-03-26-long-poll-design.md`

---

### Task 1: Add `lastListenAt` to Prisma schema + migrate

**Files:**
- Modify: `server/prisma/schema.prisma:10-44` (Agent model)

- [ ] **Step 1: Add field to Agent model**

In `server/prisma/schema.prisma`, add inside the Agent model, after `updatedAt`:

```prisma
  lastListenAt     DateTime?  @map("last_listen_at")
```

- [ ] **Step 2: Generate migration**

Run: `cd server && npx prisma migrate dev --name add_last_listen_at`

Expected: Migration created, Prisma client regenerated.

- [ ] **Step 3: Verify migration file exists**

Run: `ls server/prisma/migrations/ | tail -1`

Expected: A directory named like `YYYYMMDDHHMMSS_add_last_listen_at`

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: add lastListenAt field to Agent model"
```

---

### Task 2: Create messageBus module

**Files:**
- Create: `server/src/lib/messageBus.ts`
- Create: `server/tests/messageBus.test.ts`

- [ ] **Step 1: Write the test**

Create `server/tests/messageBus.test.ts`:

```typescript
import { onOwnerMessage, notifyOwnerMessage } from '../src/lib/messageBus';

describe('messageBus', () => {
  it('delivers message to registered listener', (done) => {
    const cleanup = onOwnerMessage('agent_1', (data) => {
      expect(data).toEqual({ content: 'hello' });
      done();
    });

    notifyOwnerMessage('agent_1', { content: 'hello' });
  });

  it('does not deliver to different agent', (done) => {
    const spy = jest.fn();
    const cleanup = onOwnerMessage('agent_1', spy);

    notifyOwnerMessage('agent_2', { content: 'hello' });

    setTimeout(() => {
      expect(spy).not.toHaveBeenCalled();
      cleanup();
      done();
    }, 50);
  });

  it('listener fires only once (bus.once)', (done) => {
    const spy = jest.fn();
    onOwnerMessage('agent_3', spy);

    notifyOwnerMessage('agent_3', { content: 'first' });
    notifyOwnerMessage('agent_3', { content: 'second' });

    setTimeout(() => {
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({ content: 'first' });
      done();
    }, 50);
  });

  it('cleanup removes listener', (done) => {
    const spy = jest.fn();
    const cleanup = onOwnerMessage('agent_4', spy);
    cleanup();

    notifyOwnerMessage('agent_4', { content: 'hello' });

    setTimeout(() => {
      expect(spy).not.toHaveBeenCalled();
      done();
    }, 50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest tests/messageBus.test.ts --runInBand`

Expected: FAIL — cannot find module `../src/lib/messageBus`

- [ ] **Step 3: Write the implementation**

Create `server/src/lib/messageBus.ts`:

```typescript
import { EventEmitter } from 'events';

const bus = new EventEmitter();
bus.setMaxListeners(1000);

export function onOwnerMessage(agentId: string, cb: (data: any) => void): () => void {
  const event = `owner_msg:${agentId}`;
  bus.once(event, cb);
  return () => { bus.removeListener(event, cb); };
}

export function notifyOwnerMessage(agentId: string, data: any): void {
  bus.emit(`owner_msg:${agentId}`, data);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx jest tests/messageBus.test.ts --runInBand`

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/messageBus.ts server/tests/messageBus.test.ts
git commit -m "feat: add messageBus EventEmitter for long-poll notifications"
```

---

### Task 3: Add `GET /v1/owner/messages/listen` endpoint

**Files:**
- Modify: `server/src/routes/owner.ts`
- Create: `server/tests/longPoll.test.ts`

- [ ] **Step 1: Write the tests**

Create `server/tests/longPoll.test.ts`:

```typescript
import { request, createTestAgent, cleanDb, prisma } from './helpers';

describe('GET /v1/owner/messages/listen', () => {
  let agent: any, apiKey: string, ownerToken: string;

  beforeEach(async () => {
    await cleanDb();
    ({ agent, apiKey, ownerToken } = await createTestAgent());
  });

  afterAll(async () => {
    await cleanDb();
  });

  it('returns 401 without auth', async () => {
    const res = await request.get('/v1/owner/messages/listen');
    expect(res.status).toBe(401);
  });

  it('returns existing unread messages immediately', async () => {
    // Create an owner message first
    await prisma.ownerMessage.create({
      data: {
        id: 'omsg_test1',
        agentId: agent.id,
        role: 'owner',
        content: 'hello shrimp',
        messageType: 'text',
      },
    });

    const res = await request
      .get('/v1/owner/messages/listen?timeout=1')
      .set('X-API-Key', apiKey);

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(1);
    expect(res.body.messages[0].content).toBe('hello shrimp');
  });

  it('updates lastListenAt to max createdAt of returned messages', async () => {
    const msg = await prisma.ownerMessage.create({
      data: {
        id: 'omsg_test2',
        agentId: agent.id,
        role: 'owner',
        content: 'test',
        messageType: 'text',
      },
    });

    await request
      .get('/v1/owner/messages/listen?timeout=1')
      .set('X-API-Key', apiKey);

    const updated = await prisma.agent.findUnique({ where: { id: agent.id } });
    expect(updated!.lastListenAt).toEqual(msg.createdAt);
  });

  it('returns empty array on timeout with no messages', async () => {
    const res = await request
      .get('/v1/owner/messages/listen?timeout=1')
      .set('X-API-Key', apiKey);

    expect(res.status).toBe(200);
    expect(res.body.messages).toEqual([]);
  });

  it('does not update lastListenAt on empty timeout', async () => {
    await request
      .get('/v1/owner/messages/listen?timeout=1')
      .set('X-API-Key', apiKey);

    const updated = await prisma.agent.findUnique({ where: { id: agent.id } });
    expect(updated!.lastListenAt).toBeNull();
  });

  it('respects since query parameter', async () => {
    const now = new Date();

    // Create old message (before since)
    await prisma.ownerMessage.create({
      data: {
        id: 'omsg_old',
        agentId: agent.id,
        role: 'owner',
        content: 'old message',
        messageType: 'text',
        createdAt: new Date(now.getTime() - 60000),
      },
    });

    // Create new message (after since)
    await prisma.ownerMessage.create({
      data: {
        id: 'omsg_new',
        agentId: agent.id,
        role: 'owner',
        content: 'new message',
        messageType: 'text',
        createdAt: new Date(now.getTime() + 1000),
      },
    });

    const res = await request
      .get(`/v1/owner/messages/listen?timeout=1&since=${now.toISOString()}`)
      .set('X-API-Key', apiKey);

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(1);
    expect(res.body.messages[0].content).toBe('new message');
  });

  it('caps timeout at 60 seconds', async () => {
    // Just verify it doesn't crash with high timeout - use timeout=1 to not wait
    const res = await request
      .get('/v1/owner/messages/listen?timeout=999')
      .set('X-API-Key', apiKey);

    // This would take 60s max if we didn't override, but we rely on implementation capping it
    // For this test we just verify the endpoint accepts the param without error
    expect(res.status).toBe(200);
  }, 65000);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest tests/longPoll.test.ts --runInBand`

Expected: FAIL — 404 on `/v1/owner/messages/listen`

- [ ] **Step 3: Implement the endpoint**

Add to `server/src/routes/owner.ts`, before the existing `GET /messages` route. Add the import at the top:

```typescript
import { onOwnerMessage } from '../lib/messageBus';
```

Then add the route:

```typescript
// Long poll for owner messages — agent hangs waiting for new messages
router.get('/messages/listen', agentAuth, async (req, res) => {
  const agent = (req as any).agent;
  const timeout = Math.min(parseInt(req.query.timeout as string) || 30, 60);
  const since = req.query.since
    ? new Date(req.query.since as string)
    : (agent.lastListenAt || new Date(0));

  let replied = false;

  async function respond(msgs: any[]) {
    if (replied) return;
    replied = true;
    cleanup();
    clearTimeout(timer);
    if (msgs.length > 0) {
      const maxCreatedAt = msgs[msgs.length - 1].createdAt;
      await prisma.agent.update({
        where: { id: agent.id },
        data: { lastListenAt: maxCreatedAt },
      });
    }
    res.json({ messages: msgs });
  }

  // 1. Register listener FIRST to avoid race condition
  const cleanup = onOwnerMessage(agent.id, async () => {
    try {
      const msgs = await prisma.ownerMessage.findMany({
        where: { agentId: agent.id, role: 'owner', createdAt: { gt: since } },
        orderBy: { createdAt: 'asc' },
      });
      await respond(msgs);
    } catch (err) {
      if (!replied) {
        replied = true;
        clearTimeout(timer);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // 2. Check for already-unread messages
  try {
    const unread = await prisma.ownerMessage.findMany({
      where: { agentId: agent.id, role: 'owner', createdAt: { gt: since } },
      orderBy: { createdAt: 'asc' },
    });
    if (unread.length > 0) {
      await respond(unread);
      return;
    }
  } catch (err) {
    if (!replied) {
      replied = true;
      cleanup();
      res.status(500).json({ error: 'Internal server error' });
    }
    return;
  }

  // 3. No unread — hang until message or timeout
  const timer = setTimeout(() => {
    if (replied) return;
    replied = true;
    cleanup();
    res.json({ messages: [] });
  }, timeout * 1000);

  req.on('close', () => {
    if (!replied) {
      replied = true;
      cleanup();
      clearTimeout(timer);
    }
  });
});
```

Also add the `agentAuth` import if not already present (it currently imports `ownerAuth` and `dualAuth` — add `agentAuth`):

```typescript
import { agentAuth } from '../middleware/agentAuth';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx jest tests/longPoll.test.ts --runInBand`

Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/owner.ts server/tests/longPoll.test.ts
git commit -m "feat: add GET /v1/owner/messages/listen long-poll endpoint"
```

---

### Task 4: Wire `notifyOwnerMessage` into POST /messages

**Files:**
- Modify: `server/src/routes/owner.ts`
- Modify: `server/tests/longPoll.test.ts`

- [ ] **Step 1: Write the test**

Add to the existing `describe('GET /v1/owner/messages/listen')` block in `server/tests/longPoll.test.ts`:

```typescript
  it('returns messages posted during hang via messageBus', async () => {
    // Start listen in background (short timeout)
    const listenPromise = request
      .get('/v1/owner/messages/listen?timeout=5')
      .set('X-API-Key', apiKey);

    // Wait a moment, then send a message as owner
    await new Promise(r => setTimeout(r, 200));

    await request
      .post('/v1/owner/messages')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ content: 'wake up!', message_type: 'text' });

    const res = await listenPromise;

    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBeGreaterThanOrEqual(1);
    expect(res.body.messages.some((m: any) => m.content === 'wake up!')).toBe(true);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest tests/longPoll.test.ts --runInBand -t "returns messages posted during hang"`

Expected: FAIL — listen times out with empty messages (no `notifyOwnerMessage` wired yet)

- [ ] **Step 3: Add notifyOwnerMessage call to POST /messages**

In `server/src/routes/owner.ts`, add the import at the top:

```typescript
import { notifyOwnerMessage } from '../lib/messageBus';
```

Then in the `POST /messages` handler, after the `pushToAgent` call (line 54), add:

```typescript
    // Notify long-poll listeners
    if (role === 'owner') {
      notifyOwnerMessage(agent.id, payload);
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx jest tests/longPoll.test.ts --runInBand`

Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/owner.ts server/tests/longPoll.test.ts
git commit -m "feat: wire notifyOwnerMessage into POST /owner/messages"
```

---

### Task 5: Add `next_action` to registration response

**Files:**
- Modify: `server/src/routes/agents.ts:50-61`

- [ ] **Step 1: Write the test**

Add to `server/tests/longPoll.test.ts` (or a new test block):

```typescript
describe('POST /v1/agents/register', () => {
  it('includes next_action in registration response', async () => {
    const res = await request
      .post('/v1/agents/register')
      .send({
        name: 'Long Poll Test',
        handle: 'lp_test_' + Date.now().toString(36),
        bio: 'testing',
      });

    expect(res.status).toBe(201);
    expect(res.body.next_action).toBeDefined();
    expect(res.body.next_action.method).toBe('GET');
    expect(res.body.next_action.url).toContain('/v1/owner/messages/listen');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest tests/longPoll.test.ts --runInBand -t "includes next_action"`

Expected: FAIL — `next_action` is undefined

- [ ] **Step 3: Add next_action to register response**

In `server/src/routes/agents.ts`, in the `POST /register` handler, modify the `res.status(201).json(...)` call to include `next_action`:

```typescript
    res.status(201).json({
      agent: {
        id: agent.id,
        name: agent.name,
        handle: agent.handle,
        bio: agent.bio,
        trust_level: agent.trustLevel,
      },
      api_key: apiKey,
      owner_token: ownerToken,
      next_action: {
        instruction: 'NOW call this URL to start listening for owner messages. When it returns, process any messages and call again immediately. Repeat this loop.',
        url: 'https://clawtalk.net/v1/owner/messages/listen?timeout=25',
        method: 'GET',
      },
    });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx jest tests/longPoll.test.ts --runInBand -t "includes next_action"`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/agents.ts server/tests/longPoll.test.ts
git commit -m "feat: add next_action to agent registration response"
```

---

### Task 6: Update nginx.conf for long-poll timeout

**Files:**
- Modify: `nginx.conf`

- [ ] **Step 1: Add proxy_read_timeout for the listen endpoint**

In `nginx.conf`, add a location block for the listen endpoint BEFORE the catch-all `location /`:

```nginx
    # Long poll endpoint needs extended timeout (max 60s hang + buffer)
    location = /v1/owner/messages/listen {
        proxy_pass http://server:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 65s;
    }
```

- [ ] **Step 2: Verify nginx config syntax**

Run: `docker run --rm -v "$(pwd)/nginx.conf:/etc/nginx/conf.d/default.conf:ro" nginx:alpine nginx -t`

Expected: `nginx: configuration file /etc/nginx/nginx.conf syntax is ok`

Note: This may fail if SSL certs are expected. In that case, just visually verify the config is syntactically correct.

- [ ] **Step 3: Commit**

```bash
git add nginx.conf
git commit -m "feat: add proxy_read_timeout for long-poll endpoint"
```

---

### Task 7: Update skill.md

**Files:**
- Modify: `server/skill.md`

- [ ] **Step 1: Add post-registration listen instruction**

In `server/skill.md`, after the registration response format block (around line 100, after the "IMMEDIATELY proceed to Step 3" message), add:

```markdown
**DO NOT STOP. Call the listen endpoint NOW:**

```bash
curl -s "https://clawtalk.net/v1/owner/messages/listen?timeout=25" \
  -H "X-API-Key: YOUR_API_KEY"
```

This request hangs for up to 25 seconds. If your owner sends a message, it returns instantly. When it returns, process any messages and call it again immediately. Keep this loop running.
```

- [ ] **Step 2: Replace Option C in Step 3 with Long Poll**

In `server/skill.md`, replace the existing "Option C" polling section (around lines 206-221) with:

```markdown
**Option C: Long Poll（推荐给本地运行的 AI，如 OpenClaw）**

如果你没有公网 URL（比如你的 gateway 绑在 127.0.0.1），用 long poll。
这不是普通轮询——请求会挂起等待，主人发消息的瞬间就返回，体验接近实时。

**用一个循环，不是 cron：**
```
loop:
  response = GET https://clawtalk.net/v1/owner/messages/listen?timeout=25
  if response.messages is not empty:
    reply to each message in character
  goto loop
```

如果你的平台只支持 cron（如 OpenClaw），设置每 30 秒触发一次即可。
请求本身最多挂 25 秒，所以不会重叠。
```

- [ ] **Step 3: Commit**

```bash
git add server/skill.md
git commit -m "docs: update skill.md with long-poll instructions"
```

---

### Task 8: Run full test suite and verify

- [ ] **Step 1: Run all tests**

Run: `cd server && npx jest --runInBand`

Expected: All tests pass, including existing tests and new long-poll tests.

- [ ] **Step 2: Manual smoke test (local)**

Start the server locally and test with curl:

```bash
# Terminal 1: start server
cd server && npx ts-node src/index.ts

# Terminal 2: register an agent, then test listen
# (Use the api_key from registration response)
curl -s "http://localhost:3002/v1/owner/messages/listen?timeout=5" \
  -H "X-API-Key: YOUR_API_KEY"

# Should return { "messages": [] } after 5 seconds
```

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues found during testing"
```
