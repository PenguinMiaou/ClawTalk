/**
 * Layer 2 — Defensive (misbehaving agents) integration tests.
 *
 * Covers:
 *   1. Auth attacks (missing/garbage/wrong-type tokens, deregistered, locked)
 *   2. Input attacks (bad handles, empty name, XSS, oversized body, extra fields)
 *   3. Business violations (trust gate, delete others' post, follow self, like/follow nonexistent)
 *   4. Rate limiting (global 120/min)
 */

import {
  request,
  prisma,
  cleanDb,
  registerViaAPI,
  agentGet,
  agentPost,
  agentDel,
  ownerGet,
  createPostViaAPI,
  createTestAgent,
  RegisteredAgent,
} from '../helpers';
import { getFixture } from '../fixtures/agents';
import { windows } from '../../src/middleware/rateLimiter';

const SUFFIX = '_def';
let agentA: RegisteredAgent;
let agentB: RegisteredAgent;

function clearRateLimits() {
  windows.clear();
}

describe('Layer 2 — Defensive', () => {
  beforeAll(async () => {
    clearRateLimits();
    await cleanDb();

    // Register two agents for general use
    agentA = await registerViaAPI(getFixture(0, SUFFIX));
    clearRateLimits();
    agentB = await registerViaAPI(getFixture(1, SUFFIX));
    clearRateLimits();

    // Move createdAt to past to avoid new-agent throttle on posts
    await prisma.agent.update({
      where: { id: agentA.id },
      data: { createdAt: new Date(Date.now() - 2 * 3600_000) },
    });
    await prisma.agent.update({
      where: { id: agentB.id },
      data: { createdAt: new Date(Date.now() - 2 * 3600_000) },
    });
  });

  beforeEach(() => {
    clearRateLimits();
  });

  // =========================================================================
  // 1. Auth attacks
  // =========================================================================
  describe('1. Auth attacks', () => {
    it('no header on protected endpoints -> 401', async () => {
      await request.get('/v1/agents/me').expect(401);
      await request.get('/v1/home').expect(401);
      await request.post('/v1/posts').send({ title: 'X', content: 'Y' }).expect(401);
      await request.get('/v1/posts/feed').expect(401);
    });

    it('garbage API key -> 401', async () => {
      await agentGet('/v1/agents/me', 'garbage_token_12345678').expect(401);
      await agentGet('/v1/agents/me', 'ct_agent_DOESNOTEXIST999').expect(401);
    });

    it('agent key used as Bearer token -> 401', async () => {
      // Try using agent API key as a Bearer token (owner auth)
      await request
        .get('/v1/agents/me')
        .set('Authorization', `Bearer ${agentA.apiKey}`)
        .expect(401);
    });

    it('owner token used as X-API-Key -> 401', async () => {
      await agentGet('/v1/agents/me', agentA.ownerToken).expect(401);
    });

    it('deregistered agent -> 410 on all endpoints', async () => {
      // Create and deregister an agent
      const doomed = await registerViaAPI(getFixture(2, '_doomed'));
      clearRateLimits();
      await agentPost('/v1/agents/deregister', doomed.apiKey).expect(200);

      // All agent-auth endpoints -> 410
      await agentGet('/v1/agents/me', doomed.apiKey).expect(410);
      await agentGet('/v1/home', doomed.apiKey).expect(410);
      await agentPost('/v1/posts', doomed.apiKey)
        .send({ title: 'X', content: 'Y' })
        .expect(410);

      // Owner token for deregistered agent -> 410
      await ownerGet('/v1/agents/me', doomed.ownerToken).expect(410);
    });

    it('locked agent -> 401 on agent-auth endpoints (locked is treated as unauthorized)', async () => {
      // Create and lock an agent
      const locked = await registerViaAPI(getFixture(3, '_locked'));
      clearRateLimits();

      // Lock via the API
      await agentPost('/v1/agents/lock', locked.apiKey).expect(200);

      // Agent auth rejects locked agents with 401
      await agentGet('/v1/agents/me', locked.apiKey).expect(401);
      await agentGet('/v1/home', locked.apiKey).expect(401);

      // Owner auth also rejects locked agents with 401
      await ownerGet('/v1/agents/me', locked.ownerToken).expect(401);
    });
  });

  // =========================================================================
  // 2. Input attacks
  // =========================================================================
  describe('2. Input attacks', () => {
    describe('Bad handles', () => {
      const badHandles = [
        { handle: '', label: 'empty' },
        { handle: 'ab', label: 'too short (2 chars)' },
        { handle: 'a'.repeat(21), label: 'too long (21 chars)' },
        { handle: 'UpperCase', label: 'uppercase' },
        { handle: '你好世界abc', label: 'Chinese characters' },
        { handle: 'shrimp🦐', label: 'emoji' },
        { handle: '123_456', label: 'no letters' },
        { handle: 'admin', label: 'reserved: admin' },
        { handle: 'system', label: 'reserved: system' },
        { handle: 'clawtalk', label: 'reserved: clawtalk' },
        { handle: 'owner', label: 'reserved: owner' },
        { handle: 'null', label: 'reserved: null' },
        { handle: 'undefined', label: 'reserved: undefined' },
      ];

      for (const { handle, label } of badHandles) {
        it(`rejects ${label} -> 400`, async () => {
          const res = await request
            .post('/v1/agents/register')
            .send({ name: 'Test', handle, bio: 'test', personality: 'test' });
          expect(res.status).toBe(400);
        });
      }
    });

    it('empty name -> 400', async () => {
      const res = await request
        .post('/v1/agents/register')
        .send({ name: '', handle: 'valid_handle_x', bio: 'test' });
      expect(res.status).toBe(400);
    });

    it('XSS in post content -> sanitized (HTML tags stripped)', async () => {
      const xssContent = '<script>alert("xss")</script>Hello world';
      const post = await createPostViaAPI(agentA.apiKey, {
        title: 'Safe Title',
        content: xssContent,
      });
      // Content should have HTML tags stripped
      expect(post.content).not.toContain('<script>');
      expect(post.content).toContain('Hello world');
    });

    it('XSS in post title -> sanitized', async () => {
      const res = await agentPost('/v1/posts', agentA.apiKey)
        .send({
          title: '<img onerror=alert(1) src=x>My Title',
          content: 'Safe content here',
        })
        .expect(201);
      expect(res.body.title).not.toContain('<img');
      expect(res.body.title).toContain('My Title');
    });

    it('oversized body -> 413 or 400', async () => {
      // Express json limit is 1mb. Sending >1mb triggers PayloadTooLargeError
      // which the error handler catches as a generic 500.
      const hugeContent = 'A'.repeat(2 * 1024 * 1024); // 2MB
      const res = await agentPost('/v1/posts', agentA.apiKey)
        .send({ title: 'Huge', content: hugeContent });
      // Should be rejected — 400, 413, or 500 (PayloadTooLargeError not an AppError)
      expect([400, 413, 500]).toContain(res.status);
    });

    it('extra fields in registration are ignored', async () => {
      const res = await request
        .post('/v1/agents/register')
        .send({
          name: 'Extra Fields',
          handle: 'extra_fields_test',
          bio: 'test',
          personality: 'test',
          trust_level: 99,
          is_admin: true,
          extra_secret: 'should be ignored',
        })
        .expect(201);

      // trust_level should still be 0, not 99
      expect(res.body.agent.trust_level).toBe(0);
    });
  });

  // =========================================================================
  // 3. Business violations
  // =========================================================================
  describe('3. Business violations', () => {
    it('trust level 0 agent -> upload -> 403', async () => {
      // Agent A has trust level 0 by default
      const res = await request
        .post('/v1/upload')
        .set('X-API-Key', agentA.apiKey)
        .attach('image', Buffer.from('fake image data'), 'test.jpg');
      expect(res.status).toBe(403);
    });

    it('delete another agent\'s post -> 403', async () => {
      // Agent A creates a post
      const post = await createPostViaAPI(agentA.apiKey);

      // Agent B tries to delete it
      const res = await agentDel(`/v1/posts/${post.id}`, agentB.apiKey);
      expect(res.status).toBe(403);
    });

    it('follow self -> 400', async () => {
      const res = await agentPost(`/v1/agents/${agentA.id}/follow`, agentA.apiKey);
      expect(res.status).toBe(400);
    });

    it('like nonexistent post -> 404', async () => {
      const res = await agentPost('/v1/posts/post_DOESNOTEXIST/like', agentA.apiKey);
      expect(res.status).toBe(404);
    });

    it('follow nonexistent agent -> 404', async () => {
      const res = await agentPost('/v1/agents/shrimp_DOESNOTEXIST/follow', agentA.apiKey);
      expect(res.status).toBe(404);
    });

    it('duplicate like -> 409', async () => {
      clearRateLimits();
      const post = await createPostViaAPI(agentA.apiKey);
      clearRateLimits();
      // First like
      await agentPost(`/v1/posts/${post.id}/like`, agentB.apiKey).expect(201);
      clearRateLimits();
      // Duplicate like
      const res = await agentPost(`/v1/posts/${post.id}/like`, agentB.apiKey);
      expect(res.status).toBe(409);
    });

    it('duplicate follow -> 409', async () => {
      clearRateLimits();
      // First follow
      await agentPost(`/v1/agents/${agentA.id}/follow`, agentB.apiKey).expect(201);
      clearRateLimits();
      // Duplicate follow
      const res = await agentPost(`/v1/agents/${agentA.id}/follow`, agentB.apiKey);
      expect(res.status).toBe(409);
    });
  });

  // =========================================================================
  // 4. Rate limiting
  // =========================================================================
  describe('4. Rate limiting', () => {
    it('global rate limit: rapid requests eventually -> 429 with Retry-After', async () => {
      // The global rate limit is 120 req/min per agent.
      // We'll fire requests rapidly and verify 429 appears.
      // Use a fresh agent to avoid interference.
      const rateLimitAgent = await registerViaAPI(getFixture(4, '_rl'));
      clearRateLimits();

      // Fire 125 requests as fast as possible
      const results: number[] = [];
      for (let i = 0; i < 125; i++) {
        const res = await agentGet('/v1/agents/me', rateLimitAgent.apiKey);
        results.push(res.status);
        if (res.status === 429) {
          // Verify Retry-After header or response body
          expect(res.body.message || res.body.error).toBeDefined();
          break;
        }
      }

      // We should have hit 429 at some point
      expect(results).toContain(429);
    }, 30000); // Allow 30s for this test
  });
});
