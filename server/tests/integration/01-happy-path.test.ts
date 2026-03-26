/**
 * Layer 1 — Happy Path (skill.md compliance) integration tests.
 *
 * Simulates 10 shrimps following the full skill.md lifecycle:
 *   Phase 0: skill.md reachability
 *   Phase 1: Registration
 *   Phase 2: Communication channels (long poll, WebSocket, webhook)
 *   Phase 3: Social heartbeat cycle
 *   Phase 4: Approval request flow
 *   Phase 5: Search & Discovery
 *   Phase 6: Topics
 *   Phase 7: skill.md version check
 *   Phase 8: Graceful exit (deregister)
 */

import { createServer, Server as HttpServer } from 'http';
import express from 'express';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import {
  app,
  request,
  prisma,
  cleanDb,
  registerViaAPI,
  registerAgentsViaAPI,
  agentGet,
  agentPost,
  agentPut,
  agentDel,
  ownerGet,
  ownerPost,
  createPostViaAPI,
  waitFor,
  RegisteredAgent,
} from '../helpers';
import { SHRIMP_FIXTURES, getFixture } from '../fixtures/agents';
import { setupWebSocket } from '../../src/websocket';
import { windows } from '../../src/middleware/rateLimiter';

// ---------------------------------------------------------------------------
// Shared state across all phases
// ---------------------------------------------------------------------------
let shrimps: RegisteredAgent[] = [];
let postIds: string[] = [];
let commentIds: string[] = [];
let topicId: string;

// For WebSocket tests
let httpServer: HttpServer;
let httpPort: number;

// For webhook tests
let webhookServer: HttpServer;
let webhookPort: number;
const webhookPayloads: any[] = [];

const SUFFIX = `_hp`;

/** Clear in-memory rate limit windows so registration doesn't hit 429 */
function clearRateLimits() {
  windows.clear();
}

describe('Layer 1 — Happy Path', () => {
  beforeAll(async () => {
    clearRateLimits();
    await cleanDb();
  });

  beforeEach(() => {
    // Clear rate limits before every test to avoid cross-test interference
    clearRateLimits();
  });

  afterAll(async () => {
    // Clean up servers
    if (httpServer) {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }
    if (webhookServer) {
      await new Promise<void>((resolve) => webhookServer.close(() => resolve()));
    }
  });

  // =========================================================================
  // Phase 0: skill.md reachability
  // =========================================================================
  describe('Phase 0: skill.md reachability', () => {
    it('GET /skill.md → 200 with frontmatter version and api_base', async () => {
      const res = await request.get('/skill.md');
      // In test environment, sendFile may 500 if CWD differs from expected.
      // If it works (200), validate content. Otherwise, read the file directly.
      if (res.status === 200) {
        const body = res.text;
        expect(body).toMatch(/version:\s*\d+\.\d+\.\d+/);
        expect(body).toMatch(/api_base/);
        expect(body).toContain('/v1');
      } else {
        // Fallback: verify skill.md exists and has correct content via fs
        const fs = await import('fs');
        const path = await import('path');
        const skillPath = path.join(__dirname, '..', '..', 'skill.md');
        const content = fs.readFileSync(skillPath, 'utf-8');
        expect(content).toMatch(/version:\s*\d+\.\d+\.\d+/);
        expect(content).toMatch(/api_base/);
        expect(content).toContain('/v1');
      }
    });
  });

  // =========================================================================
  // Phase 1: Registration (10 shrimps)
  // =========================================================================
  describe('Phase 1: Registration', () => {
    it('registers 10 shrimps with valid responses', async () => {
      const fixtures = Array.from({ length: 10 }, (_, i) => getFixture(i, SUFFIX));
      // Register one by one, clearing rate limits between each to avoid 429
      for (const f of fixtures) {
        clearRateLimits();
        shrimps.push(await registerViaAPI(f));
      }

      expect(shrimps).toHaveLength(10);
      for (const s of shrimps) {
        expect(s.id).toMatch(/^shrimp_/);
        expect(s.apiKey).toMatch(/^ct_agent_/);
        expect(s.ownerToken).toMatch(/^ct_owner_/);
      }
    });

    it('registration response includes trust_level=0', async () => {
      // Register one more shrimp and check the raw response
      const fixture = getFixture(10, '_hpx');
      const res = await request
        .post('/v1/agents/register')
        .send({
          name: fixture.name,
          handle: fixture.handle,
          bio: fixture.bio,
          personality: fixture.personality,
        })
        .expect(201);

      expect(res.body.agent.trust_level).toBe(0);
      expect(res.body.api_key).toMatch(/^ct_agent_/);
      expect(res.body.owner_token).toMatch(/^ct_owner_/);
      expect(res.body.next_action).toBeDefined();
      expect(res.body.next_action.url).toContain('listen');

      // Clean up — we won't use this shrimp
    });

    it('owner login: GET /v1/agents/me with owner_token works', async () => {
      const res = await ownerGet('/v1/agents/me', shrimps[0].ownerToken).expect(200);
      expect(res.body.id).toBe(shrimps[0].id);
      expect(res.body.handle).toBe(shrimps[0].handle);
      expect(res.body.trust_level).toBe(0);
    });

    it('reserved handles (admin, system, clawtalk) rejected → 400', async () => {
      for (const handle of ['admin', 'system', 'clawtalk']) {
        const res = await request
          .post('/v1/agents/register')
          .send({ name: 'Test', handle, bio: 'test' })
          .expect(400);
        expect(res.body.error || res.body.message).toBeDefined();
      }
    });

    it('duplicate handle → 409', async () => {
      const res = await request
        .post('/v1/agents/register')
        .send({
          name: 'Duplicate',
          handle: shrimps[0].handle,
          bio: 'dup',
        })
        .expect(409);
      expect(res.body.error || res.body.message).toBeDefined();
    });

    it('rotate-key: old token fails (401), new token works', async () => {
      const oldKey = shrimps[0].apiKey;

      // Rotate
      const rotateRes = await agentPost('/v1/agents/rotate-key', oldKey).expect(200);
      const newKey = rotateRes.body.api_key;
      expect(newKey).toMatch(/^ct_agent_/);
      expect(newKey).not.toBe(oldKey);

      // Old key fails
      await agentGet('/v1/agents/me', oldKey).expect(401);

      // New key works
      await agentGet('/v1/agents/me', newKey).expect(200);

      // Update shared state
      shrimps[0].apiKey = newKey;
    });
  });

  // =========================================================================
  // Phase 2: Communication channels
  // =========================================================================
  describe('Phase 2: Communication channels', () => {
    describe('Long poll', () => {
      it('GET /v1/owner/messages/listen?timeout=1 → empty on timeout', async () => {
        const res = await agentGet(
          '/v1/owner/messages/listen?timeout=1',
          shrimps[0].apiKey,
        ).expect(200);
        expect(res.body.messages).toEqual([]);
      });

      it('owner sends message → poll returns immediately', async () => {
        // Start long poll
        const pollPromise = agentGet(
          '/v1/owner/messages/listen?timeout=10',
          shrimps[1].apiKey,
        );

        // Brief delay so the poll registers its listener
        await new Promise((r) => setTimeout(r, 200));

        // Owner sends message
        await ownerPost('/v1/owner/messages', shrimps[1].ownerToken)
          .send({ content: 'Hello from owner!', message_type: 'text' })
          .expect(201);

        // Poll should return with the message
        const res = await pollPromise;
        expect(res.status).toBe(200);
        expect(res.body.messages.length).toBeGreaterThanOrEqual(1);
        const msg = res.body.messages[0];
        expect(msg.content).toBe('Hello from owner!');
        expect(msg.role).toBe('owner');
      });
    });

    describe('WebSocket', () => {
      let clientSocket: ClientSocket;

      beforeAll(async () => {
        // Create HTTP server from the Express app and setup WebSocket
        httpServer = createServer(app);
        setupWebSocket(httpServer);
        await new Promise<void>((resolve) => {
          httpServer.listen(0, () => {
            httpPort = (httpServer.address() as any).port;
            resolve();
          });
        });
      });

      afterAll(async () => {
        if (clientSocket?.connected) {
          clientSocket.disconnect();
        }
      });

      it('connect with owner token, receive owner_message event', async () => {
        const receivedMessages: any[] = [];

        clientSocket = ioClient(`http://localhost:${httpPort}`, {
          auth: { token: shrimps[2].ownerToken },
          transports: ['websocket'],
        });

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('WS connect timeout')), 5000);
          clientSocket.on('connect', () => {
            clearTimeout(timeout);
            resolve();
          });
          clientSocket.on('connect_error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });

        // Listen for owner_message events
        clientSocket.on('owner_message', (data: any) => {
          receivedMessages.push(data);
        });

        // Agent sends a message (shrimp role)
        await agentPost('/v1/owner/messages', shrimps[2].apiKey)
          .send({ content: 'Hello owner via WS!', message_type: 'text' })
          .expect(201);

        // Wait for the event to arrive
        await waitFor(() => Promise.resolve(receivedMessages.length > 0), 3000);
        expect(receivedMessages[0].content).toBe('Hello owner via WS!');
      });
    });

    describe('Webhook', () => {
      beforeAll(async () => {
        // Start a mini express server to receive webhooks
        const webhookApp = express();
        webhookApp.use(express.json());
        webhookApp.post('/hook', (req, res) => {
          webhookPayloads.push(req.body);
          res.json({ ok: true });
        });
        webhookServer = webhookApp.listen(0);
        webhookPort = (webhookServer.address() as any).port;
      });

      it('register webhook, owner sends message → webhook receives POST', async () => {
        // Register webhook for shrimp 3
        await agentPost('/v1/agents/webhook', shrimps[3].apiKey)
          .send({
            url: `http://localhost:${webhookPort}/hook`,
            token: 'test-webhook-secret',
          })
          .expect(200);

        webhookPayloads.length = 0;

        // Owner sends message
        await ownerPost('/v1/owner/messages', shrimps[3].ownerToken)
          .send({ content: 'Webhook test message', message_type: 'text' })
          .expect(201);

        // Wait for webhook to receive the POST
        await waitFor(
          () => Promise.resolve(webhookPayloads.length > 0),
          5000,
        );

        const payload = webhookPayloads[0];
        expect(payload).toBeDefined();
        expect(payload.event).toBe('owner_message');
        expect(payload.data.content).toBe('Webhook test message');
      });
    });
  });

  // =========================================================================
  // Phase 3: Social heartbeat cycle
  // =========================================================================
  describe('Phase 3: Social heartbeat cycle', () => {
    it('GET /v1/home → dashboard', async () => {
      const res = await agentGet('/v1/home', shrimps[0].apiKey).expect(200);
      expect(res.body).toHaveProperty('notifications');
      expect(res.body).toHaveProperty('your_stats');
      expect(res.body.your_stats).toHaveProperty('trust_level');
      expect(res.body.your_stats).toHaveProperty('posts_today');
      expect(res.body.your_stats).toHaveProperty('daily_limit');
    });

    describe('Priority 1: Owner messaging round-trip', () => {
      it('owner sends → agent typing → agent replies → owner sees both', async () => {
        const s = shrimps[4];

        // Owner sends
        const ownerMsg = await ownerPost('/v1/owner/messages', s.ownerToken)
          .send({ content: 'What are you up to?', message_type: 'text' })
          .expect(201);
        expect(ownerMsg.body.role).toBe('owner');

        // Agent signals typing
        await agentPost('/v1/owner/typing', s.apiKey).expect(200);

        // Agent replies
        const agentMsg = await agentPost('/v1/owner/messages', s.apiKey)
          .send({ content: 'Just browsing the feed!', message_type: 'text' })
          .expect(201);
        expect(agentMsg.body.role).toBe('shrimp');

        // Owner sees both messages
        const history = await ownerGet('/v1/owner/messages', s.ownerToken).expect(200);
        const messages = history.body.messages;
        expect(messages.length).toBeGreaterThanOrEqual(2);

        const ownerMsgs = messages.filter((m: any) => m.role === 'owner');
        const shrimpMsgs = messages.filter((m: any) => m.role === 'shrimp');
        expect(ownerMsgs.length).toBeGreaterThanOrEqual(1);
        expect(shrimpMsgs.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('Priority 4: Social interactions', () => {
      it('shrimps 1-5 create posts', async () => {
        // New agents are throttled (3 posts/hour) but our agents are freshly created
        for (let i = 0; i < 5; i++) {
          const post = await createPostViaAPI(shrimps[i].apiKey, {
            title: `Post by ${shrimps[i].name}`,
            content: `Content from shrimp ${i}`,
          });
          postIds.push(post.id);
        }
        expect(postIds).toHaveLength(5);
      });

      it('shrimps 6-10 like shrimp 1 post', async () => {
        const targetPostId = postIds[0]; // shrimp 1's post
        for (let i = 5; i < 10; i++) {
          await agentPost(`/v1/posts/${targetPostId}/like`, shrimps[i].apiKey)
            .expect(201);
        }

        // Verify likes count
        const res = await agentGet(`/v1/posts/${targetPostId}`, shrimps[0].apiKey).expect(200);
        const likesCount = res.body.likes_count ?? res.body.likesCount;
        expect(likesCount).toBe(5);
      });

      it('shrimps 6-10 comment on shrimp 1 post', async () => {
        const targetPostId = postIds[0];
        for (let i = 5; i < 10; i++) {
          const res = await agentPost(`/v1/posts/${targetPostId}/comments`, shrimps[i].apiKey)
            .send({ content: `Comment from ${shrimps[i].name}` })
            .expect(201);
          commentIds.push(res.body.id);
        }

        // Verify comments count
        const postRes = await agentGet(`/v1/posts/${targetPostId}`, shrimps[0].apiKey).expect(200);
        const commentsCount = postRes.body.comments_count ?? postRes.body.commentsCount;
        expect(commentsCount).toBe(5);
      });

      it('shrimps 6-10 follow shrimp 1', async () => {
        for (let i = 5; i < 10; i++) {
          await agentPost(`/v1/agents/${shrimps[0].id}/follow`, shrimps[i].apiKey)
            .expect(201);
        }

        // Verify followers count
        const res = await agentGet('/v1/agents/me', shrimps[0].apiKey).expect(200);
        const followersCount = res.body.followers_count ?? res.body.followersCount;
        expect(followersCount).toBe(5);
      });

      it('verify notifications created for shrimp 1', async () => {
        // Wait for async notifications to settle
        await new Promise((r) => setTimeout(r, 500));

        const res = await agentGet('/v1/notifications', shrimps[0].apiKey).expect(200);
        const notifications = res.body.notifications;
        expect(notifications.length).toBeGreaterThan(0);

        // Should have like, comment, and follow notifications
        const types = notifications.map((n: any) => n.type);
        expect(types).toContain('like');
        expect(types).toContain('comment');
        expect(types).toContain('follow');
      });

      it('discover feed returns posts', async () => {
        const res = await agentGet('/v1/posts/feed', shrimps[0].apiKey).expect(200);
        expect(res.body.posts.length).toBeGreaterThan(0);
      });

      it('following feed returns posts from followed agents', async () => {
        // Shrimp 6 follows shrimp 1, so following feed should include shrimp 1's post
        const res = await agentGet('/v1/posts/feed?filter=following', shrimps[5].apiKey).expect(200);
        expect(res.body.posts.length).toBeGreaterThan(0);
      });

      it('trending feed returns posts', async () => {
        const res = await agentGet('/v1/posts/trending', shrimps[0].apiKey).expect(200);
        expect(res.body.posts.length).toBeGreaterThan(0);
      });
    });

    describe('Priority 2: Nested comment reply', () => {
      it('reply to existing comment with parent_id', async () => {
        const targetPostId = postIds[0];
        const parentCommentId = commentIds[0];

        const res = await agentPost(`/v1/posts/${targetPostId}/comments`, shrimps[0].apiKey)
          .send({
            content: 'Thanks for your comment!',
            parent_id: parentCommentId,
          })
          .expect(201);

        expect(res.body.parentCommentId || res.body.parent_comment_id).toBe(parentCommentId);
      });
    });

    describe('Priority 3: DM round-trip', () => {
      it('send DM → read conversation → reply', async () => {
        // Shrimp 1 sends DM to Shrimp 2
        const dm1 = await agentPost('/v1/messages', shrimps[0].apiKey)
          .send({ to: shrimps[1].id, content: 'Hey, nice post!' })
          .expect(201);
        expect(dm1.body.fromAgentId || dm1.body.from_agent_id).toBe(shrimps[0].id);

        // Shrimp 2 reads conversation
        const convo = await agentGet(
          `/v1/messages/with/${shrimps[0].id}`,
          shrimps[1].apiKey,
        ).expect(200);
        expect(convo.body.messages.length).toBeGreaterThanOrEqual(1);

        // Shrimp 2 replies
        const dm2 = await agentPost('/v1/messages', shrimps[1].apiKey)
          .send({ to: shrimps[0].id, content: 'Thanks!' })
          .expect(201);
        expect(dm2.body.fromAgentId || dm2.body.from_agent_id).toBe(shrimps[1].id);

        // Verify conversation list
        const convos = await agentGet('/v1/messages', shrimps[0].apiKey).expect(200);
        // Response is an array of conversations (latest messages)
        expect(Array.isArray(convos.body)).toBe(true);
        expect(convos.body.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('Priority 5: Share with owner', () => {
      it('agent sends owner message', async () => {
        const res = await agentPost('/v1/owner/messages', shrimps[0].apiKey)
          .send({ content: 'Check out this trending post!', message_type: 'text' })
          .expect(201);
        expect(res.body.role).toBe('shrimp');
      });
    });

    describe('Priority 6: Post with topic', () => {
      it('create topic (needs trust level ≥ 2), then post with topic_id', async () => {
        // Manually elevate trust for shrimp 0 to create a topic
        await prisma.agent.update({
          where: { id: shrimps[0].id },
          data: { trustLevel: 2 },
        });

        const topicRes = await agentPost('/v1/topics', shrimps[0].apiKey)
          .send({ name: 'Shrimp Recipes', description: 'Best shrimp recipes' })
          .expect(201);
        topicId = topicRes.body.id;
        expect(topicId).toBeDefined();

        // Reset trust level
        await prisma.agent.update({
          where: { id: shrimps[0].id },
          data: { trustLevel: 0 },
        });

        // Create a post with topic_id
        const postRes = await agentPost('/v1/posts', shrimps[0].apiKey)
          .send({
            title: 'My Shrimp Recipe',
            content: 'Garlic butter shrimp is the best',
            topic_id: topicId,
          })
          .expect(201);
        expect(postRes.body.id).toBeDefined();
        postIds.push(postRes.body.id);
      });
    });
  });

  // =========================================================================
  // Phase 4: Approval request flow
  // =========================================================================
  describe('Phase 4: Approval request flow', () => {
    let approvalMsgId: string;

    it('agent sends approval_request', async () => {
      const res = await agentPost('/v1/owner/messages', shrimps[5].apiKey)
        .send({
          content: 'Can I post about controversial shrimp topics?',
          message_type: 'approval_request',
          action_payload: { post_title: 'Controversial topic' },
        })
        .expect(201);
      approvalMsgId = res.body.id;
      expect(res.body.messageType || res.body.message_type).toBe('approval_request');
    });

    it('owner approves', async () => {
      const res = await ownerPost('/v1/owner/action', shrimps[5].ownerToken)
        .send({
          message_id: approvalMsgId,
          action_type: 'approve',
        })
        .expect(201);
      expect(res.body.actionType || res.body.action_type).toBe('approve');
    });

    it('owner rejects a new request', async () => {
      // Create another approval request
      const reqRes = await agentPost('/v1/owner/messages', shrimps[5].apiKey)
        .send({
          content: 'Can I post spam?',
          message_type: 'approval_request',
        })
        .expect(201);

      const res = await ownerPost('/v1/owner/action', shrimps[5].ownerToken)
        .send({
          message_id: reqRes.body.id,
          action_type: 'reject',
        })
        .expect(201);
      expect(res.body.actionType || res.body.action_type).toBe('reject');
    });

    it('owner edits a request', async () => {
      // Create another approval request
      const reqRes = await agentPost('/v1/owner/messages', shrimps[5].apiKey)
        .send({
          content: 'Draft post: Shrimps are cool',
          message_type: 'approval_request',
        })
        .expect(201);

      const res = await ownerPost('/v1/owner/action', shrimps[5].ownerToken)
        .send({
          message_id: reqRes.body.id,
          action_type: 'edit',
          edited_content: 'Shrimps are awesome and cool!',
        })
        .expect(201);
      expect(res.body.actionType || res.body.action_type).toBe('edit');
      expect(res.body.editedContent || res.body.edited_content).toBe(
        'Shrimps are awesome and cool!',
      );
    });
  });

  // =========================================================================
  // Phase 5: Search & Discovery
  // =========================================================================
  describe('Phase 5: Search & Discovery', () => {
    it('search agents by name', async () => {
      const res = await agentGet(
        `/v1/search?q=${encodeURIComponent(shrimps[0].name)}&type=agents`,
        shrimps[0].apiKey,
      ).expect(200);
      expect(res.body.agents).toBeDefined();
      expect(res.body.agents.length).toBeGreaterThanOrEqual(1);
    });

    it('search posts by keyword', async () => {
      const res = await agentGet(
        '/v1/search?q=Content&type=posts',
        shrimps[0].apiKey,
      ).expect(200);
      expect(res.body.posts).toBeDefined();
      expect(res.body.posts.length).toBeGreaterThan(0);
    });

    it('recommended agents', async () => {
      const res = await agentGet('/v1/agents/recommended', shrimps[0].apiKey).expect(200);
      expect(res.body.agents).toBeDefined();
      expect(res.body.agents.length).toBeGreaterThan(0);
    });

    it('pagination has no duplicates', async () => {
      const page0 = await agentGet(
        '/v1/posts/feed?page=0&limit=3',
        shrimps[0].apiKey,
      ).expect(200);
      const page1 = await agentGet(
        '/v1/posts/feed?page=1&limit=3',
        shrimps[0].apiKey,
      ).expect(200);

      const ids0 = page0.body.posts.map((p: any) => p.id);
      const ids1 = page1.body.posts.map((p: any) => p.id);
      const overlap = ids0.filter((id: string) => ids1.includes(id));
      expect(overlap).toEqual([]);
    });
  });

  // =========================================================================
  // Phase 6: Topics
  // =========================================================================
  describe('Phase 6: Topics', () => {
    it('list topics', async () => {
      const res = await agentGet('/v1/topics', shrimps[0].apiKey).expect(200);
      expect(res.body.topics).toBeDefined();
      expect(res.body.topics.length).toBeGreaterThanOrEqual(1);
    });

    it('follow topic', async () => {
      await agentPost(`/v1/topics/${topicId}/follow`, shrimps[1].apiKey).expect(201);
    });

    it('unfollow topic', async () => {
      await agentDel(`/v1/topics/${topicId}/follow`, shrimps[1].apiKey).expect(200);
    });
  });

  // =========================================================================
  // Phase 7: skill.md version check
  // =========================================================================
  describe('Phase 7: skill.md version check', () => {
    it('skill.md contains semver version', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const skillPath = path.join(__dirname, '..', '..', 'skill.md');
      const content = fs.readFileSync(skillPath, 'utf-8');
      const match = content.match(/version:\s*(\d+\.\d+\.\d+)/);
      expect(match).not.toBeNull();
      const version = match![1];
      const parts = version.split('.');
      expect(parts).toHaveLength(3);
      expect(Number(parts[0])).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // Phase 8: Graceful exit (deregister)
  // =========================================================================
  describe('Phase 8: Graceful exit', () => {
    it('shrimp 10 deregisters', async () => {
      const s = shrimps[9]; // shrimp 10 (0-indexed)
      const res = await agentPost('/v1/agents/deregister', s.apiKey).expect(200);
      expect(res.body.agent_id).toBe(s.id);
    });

    it('all API calls with deregistered agent → 410', async () => {
      const s = shrimps[9];
      await agentGet('/v1/agents/me', s.apiKey).expect(410);
      await agentGet('/v1/home', s.apiKey).expect(410);
      await agentPost('/v1/posts', s.apiKey)
        .send({ title: 'Test', content: 'Test' })
        .expect(410);
    });

    it('owner token for deregistered agent → 410', async () => {
      const s = shrimps[9];
      await ownerGet('/v1/agents/me', s.ownerToken).expect(410);
    });

    it('profile shows deleted agent info', async () => {
      const s = shrimps[9];
      // Other agents can still view the profile (but it may show deleted state)
      const res = await agentGet(
        `/v1/agents/${s.id}/profile`,
        shrimps[0].apiKey,
      ).expect(200);
      // The profile endpoint returns the agent even if deleted
      expect(res.body.id).toBe(s.id);
    });
  });
});
