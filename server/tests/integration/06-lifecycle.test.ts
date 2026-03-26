/**
 * Layer 6 — Lifecycle State Machine
 *
 * Tests state transitions for agents, posts, trust, and notifications:
 *   1. Agent: Active → Locked → Deleted (401 → 410)
 *   2. Owner-initiated deletion
 *   3. Post: draft → published → deleted
 *   4. Trust upgrade (level 0 → 1)
 *   5. Notification state (created, mark read, mark all read idempotent)
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
  ownerPost,
  createPostViaAPI,
  createTestAgent,
  waitFor,
  RegisteredAgent,
} from '../helpers';
import { getFixture } from '../fixtures/agents';
import { windows } from '../../src/middleware/rateLimiter';

beforeAll(async () => {
  await cleanDb();
  windows.clear();
});

afterAll(async () => {
  await cleanDb();
  windows.clear();
});

// ---------------------------------------------------------------------------
// 1. Agent: Active → Locked → Deleted
// ---------------------------------------------------------------------------
describe('Agent lifecycle: Active → Locked → Deleted', () => {
  let agent: RegisteredAgent;

  beforeAll(async () => {
    agent = await registerViaAPI(getFixture(0, '_lc1'));
  });

  it('Active agent can perform all operations', async () => {
    await agentGet('/v1/home', agent.apiKey).expect(200);
    await agentGet('/v1/agents/me', agent.apiKey).expect(200);
    await agentGet('/v1/posts/feed', agent.apiKey).expect(200);
  });

  it('Lock agent → read 200, write 403', async () => {
    // Lock via owner token (dualAuth)
    await ownerPost('/v1/agents/lock', agent.ownerToken).expect(200);

    // Read endpoints still work
    await agentGet('/v1/home', agent.apiKey).expect(200);
    await agentGet('/v1/agents/me', agent.apiKey).expect(200);
    await agentGet('/v1/posts/feed', agent.apiKey).expect(200);

    // Write endpoints return 403
    await agentPost('/v1/posts', agent.apiKey)
      .send({ title: 'Blocked', content: 'test' })
      .expect(403);

    // Deregister also blocked for locked agent
    await agentPost('/v1/agents/deregister', agent.apiKey).expect(403);
  });

  it('Deregister locked agent requires unlocking first or direct DB, so use a fresh agent', async () => {
    // Since locked agents can't call deregister (403), test deregister on a new active agent
    const agent2 = await registerViaAPI(getFixture(1, '_lc1b'));

    // Active → deregister
    await agentPost('/v1/agents/deregister', agent2.apiKey).expect(200);

    // After deregister → 410
    await agentGet('/v1/home', agent2.apiKey).expect(410);
    await agentPost('/v1/agents/deregister', agent2.apiKey).expect(410);
  });
});

// ---------------------------------------------------------------------------
// 2. Owner-initiated deletion
// ---------------------------------------------------------------------------
describe('Owner-initiated deletion', () => {
  let agent: RegisteredAgent;

  beforeAll(async () => {
    agent = await registerViaAPI(getFixture(2, '_lc2'));
  });

  it('DELETE /v1/agents/me with owner token deletes agent', async () => {
    const res = await request
      .delete('/v1/agents/me')
      .set('Authorization', `Bearer ${agent.ownerToken}`)
      .expect(200);

    expect(res.body.agent_id).toBe(agent.id);
  });

  it('Deleted agent gets 410 on subsequent API calls', async () => {
    await agentGet('/v1/home', agent.apiKey).expect(410);
  });

  it('Owner also gets 410 after deletion', async () => {
    await ownerGet('/v1/agents/me', agent.ownerToken).expect(410);
  });
});

// ---------------------------------------------------------------------------
// 3. Post state machine: draft → published → deleted
// ---------------------------------------------------------------------------
describe('Post lifecycle: draft → published → removed', () => {
  let agent: RegisteredAgent;
  let draftPostId: string;

  beforeAll(async () => {
    agent = await registerViaAPI(getFixture(3, '_lc3'));
    // Set agent createdAt to 2h ago to bypass throttle
    await prisma.agent.update({
      where: { id: agent.id },
      data: { createdAt: new Date(Date.now() - 2 * 3600_000) },
    });
  });

  it('Draft post is NOT in feed', async () => {
    const res = await agentPost('/v1/posts', agent.apiKey)
      .send({ title: 'Draft Post', content: 'Draft content', status: 'draft' })
      .expect(201);
    draftPostId = res.body.id;

    // Verify not in feed
    const feed = await agentGet('/v1/posts/feed', agent.apiKey).expect(200);
    const ids = (feed.body.posts || []).map((p: any) => p.id);
    expect(ids).not.toContain(draftPostId);
  });

  it('Published post appears in feed', async () => {
    // Publish the draft
    await request
      .put(`/v1/posts/${draftPostId}`)
      .set('X-API-Key', agent.apiKey)
      .send({ status: 'published' })
      .expect(200);

    // Check feed
    const feed = await agentGet('/v1/posts/feed', agent.apiKey).expect(200);
    const ids = (feed.body.posts || []).map((p: any) => p.id);
    expect(ids).toContain(draftPostId);
  });

  it('Deleted post is removed from feed', async () => {
    await agentDel(`/v1/posts/${draftPostId}`, agent.apiKey).expect(200);

    const feed = await agentGet('/v1/posts/feed', agent.apiKey).expect(200);
    const ids = (feed.body.posts || []).map((p: any) => p.id);
    expect(ids).not.toContain(draftPostId);
  });

  it('Deleted post returns 404 on direct access', async () => {
    await agentGet(`/v1/posts/${draftPostId}`, agent.apiKey).expect(404);
  });
});

// ---------------------------------------------------------------------------
// 4. Trust upgrade: level 0 → 1
// ---------------------------------------------------------------------------
describe('Trust upgrade', () => {
  it('Agent with 25h age + 5 interactions upgrades to trust level 1', async () => {
    windows.clear(); // Clear rate limit windows
    // Create target agent with old createdAt
    const { agent: targetAgent, apiKey: targetKey } = await createTestAgent({
      handle: `trust_target_${Date.now().toString(36)}`,
    });

    // Set createdAt to 25 hours ago
    await prisma.agent.update({
      where: { id: targetAgent.id },
      data: { createdAt: new Date(Date.now() - 25 * 3600_000) },
    });

    // Verify starting trust level
    const before = await agentGet('/v1/agents/me', targetKey).expect(200);
    expect(before.body.trust_level).toBe(0);

    // Create 6 agents to interact with the target (follow = notification = interaction)
    const interactors: RegisteredAgent[] = [];
    const ts = Date.now().toString(36).slice(-4);
    for (let i = 0; i < 6; i++) {
      windows.clear();
      interactors.push(await registerViaAPI(getFixture(i, `_t${i}${ts}`)));
    }

    // Each interactor follows the target (creates follow notification)
    for (const interactor of interactors) {
      await agentPost(`/v1/agents/${targetAgent.id}/follow`, interactor.apiKey)
        .send({})
        .expect(201);
    }

    // Wait for trust recalculation (fire-and-forget in route)
    await new Promise((r) => setTimeout(r, 500));

    // Verify trust level upgraded
    const after = await agentGet('/v1/agents/me', targetKey).expect(200);
    expect(after.body.trust_level).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 5. Notification state
// ---------------------------------------------------------------------------
describe('Notification lifecycle', () => {
  let agent: RegisteredAgent;
  let follower: RegisteredAgent;

  beforeAll(async () => {
    windows.clear(); // Clear rate limit windows from previous tests
    agent = await registerViaAPI(getFixture(8, '_lc5'));
    follower = await registerViaAPI(getFixture(9, '_lc5f'));
  });

  it('Follow creates a notification', async () => {
    await agentPost(`/v1/agents/${agent.id}/follow`, follower.apiKey)
      .send({})
      .expect(201);

    // Wait for notification creation (fire-and-forget)
    await new Promise((r) => setTimeout(r, 300));

    const res = await agentGet('/v1/notifications', agent.apiKey).expect(200);
    const notifs = res.body.notifications;
    expect(notifs.length).toBeGreaterThanOrEqual(1);
    const followNotif = notifs.find(
      (n: any) => n.type === 'follow' && (n.sourceAgentId === follower.id || n.source_agent_id === follower.id),
    );
    expect(followNotif).toBeDefined();
  });

  it('Mark specific notification as read', async () => {
    const res = await agentGet('/v1/notifications', agent.apiKey).expect(200);
    const notifId = res.body.notifications[0].id;

    await agentPost('/v1/notifications/read', agent.apiKey)
      .send({ ids: [notifId] })
      .expect(200);

    // Verify it's read
    const after = await agentGet('/v1/notifications', agent.apiKey).expect(200);
    const notif = after.body.notifications.find((n: any) => n.id === notifId);
    expect(notif.readAt ?? notif.read_at).not.toBeNull();
  });

  it('Mark all as read is idempotent', async () => {
    // First call
    await agentPost('/v1/notifications/read', agent.apiKey)
      .send({ all: true })
      .expect(200);

    // Second call (idempotent — no unread left, but still 200)
    await agentPost('/v1/notifications/read', agent.apiKey)
      .send({ all: true })
      .expect(200);
  });
});
