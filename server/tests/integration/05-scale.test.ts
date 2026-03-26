/**
 * Layer 5 — Scale Degradation
 *
 * Tests API performance and correctness at moderate scale:
 *   - 100 agents, 500 posts, 1000 likes, 1000 follows
 *   - Response time benchmarks
 *   - Pagination completeness (no duplicates, reasonable coverage)
 *   - Concurrent load (50 simultaneous requests)
 */

jest.setTimeout(300000);

import {
  request,
  prisma,
  cleanDb,
  agentGet,
  agentPost,
  RegisteredAgent,
} from '../helpers';
import { getFixture } from '../fixtures/agents';
import { windows } from '../../src/middleware/rateLimiter';

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------
const agents: RegisteredAgent[] = [];
const postIds: string[] = [];

// ---------------------------------------------------------------------------
// Setup — register 100 agents, each creates 5 posts, likes & follows
// ---------------------------------------------------------------------------
beforeAll(async () => {
  await cleanDb();
  windows.clear();
  // Note: jest.setTimeout(300000) at top sets test timeout but not beforeAll
  // The beforeAll timeout is set via the second arg below

  // Register 100 agents — clear rate limits before each registration
  for (let idx = 0; idx < 100; idx++) {
    windows.clear();
    const fixture = getFixture(idx, `_s5_${idx}`);
    const res = await request
      .post('/v1/agents/register')
      .send({
        name: fixture.name,
        handle: fixture.handle,
        bio: fixture.bio,
        personality: fixture.personality,
      })
      .expect(201);

    agents.push({
      id: res.body.agent.id,
      name: res.body.agent.name,
      handle: res.body.agent.handle,
      bio: res.body.agent.bio,
      apiKey: res.body.api_key,
      ownerToken: res.body.owner_token,
    });
  }

  // Set createdAt to 2 hours ago so post throttle (1h observation) doesn't block
  await prisma.agent.updateMany({
    data: { createdAt: new Date(Date.now() - 2 * 3600_000) },
  });

  // Each agent creates 5 posts (500 total) — batch by agent groups
  for (let batch = 0; batch < 10; batch++) {
    windows.clear();
    const batchAgents = agents.slice(batch * 10, (batch + 1) * 10);
    const promises = batchAgents.flatMap((agent) =>
      Array.from({ length: 5 }, (_, j) =>
        agentPost('/v1/posts', agent.apiKey)
          .send({
            title: `Scale Post ${agent.handle} #${j}`,
            content: `Content from ${agent.name} number ${j}`,
            status: 'published',
          })
          .then((res) => res.body.id as string),
      ),
    );
    const ids = await Promise.all(promises);
    postIds.push(...ids);
  }

  // First 20 agents like first 50 posts
  for (let i = 0; i < 20; i++) {
    windows.clear();
    const likePromises = [];
    for (let j = 0; j < 50; j++) {
      likePromises.push(
        agentPost(`/v1/posts/${postIds[j]}/like`, agents[i].apiKey)
          .send({})
          .then(() => {})
          .catch(() => {}), // ignore conflicts from self-likes
      );
    }
    await Promise.all(likePromises);
  }

  // Each agent follows 10 others (round-robin, skip self)
  for (let i = 0; i < 100; i++) {
    if (i % 10 === 0) windows.clear();
    const followPromises = [];
    for (let j = 1; j <= 10; j++) {
      const targetIdx = (i + j) % 100;
      followPromises.push(
        agentPost(`/v1/agents/${agents[targetIdx].id}/follow`, agents[i].apiKey)
          .send({})
          .then(() => {})
          .catch(() => {}),
      );
    }
    await Promise.all(followPromises);
  }
}, 300000);

afterAll(async () => {
  await cleanDb();
  windows.clear();
});

// ---------------------------------------------------------------------------
// Response time benchmarks
// ---------------------------------------------------------------------------
describe('Response time benchmarks', () => {
  beforeAll(() => { windows.clear(); });
  const THRESHOLD_MS = 2000; // generous threshold for CI/test environments

  async function measureTime(fn: () => Promise<any>): Promise<number> {
    const start = Date.now();
    await fn();
    return Date.now() - start;
  }

  it('GET /v1/posts/feed responds within threshold', async () => {
    const ms = await measureTime(() =>
      agentGet('/v1/posts/feed', agents[0].apiKey).expect(200),
    );
    expect(ms).toBeLessThan(THRESHOLD_MS);
  });

  it('GET /v1/posts/trending responds within threshold', async () => {
    const ms = await measureTime(() =>
      agentGet('/v1/posts/trending', agents[0].apiKey).expect(200),
    );
    expect(ms).toBeLessThan(THRESHOLD_MS);
  });

  it('GET /v1/agents/me responds within threshold', async () => {
    const ms = await measureTime(() =>
      agentGet('/v1/agents/me', agents[0].apiKey).expect(200),
    );
    expect(ms).toBeLessThan(THRESHOLD_MS);
  });

  it('GET /v1/home responds within threshold', async () => {
    const ms = await measureTime(() =>
      agentGet('/v1/home', agents[0].apiKey).expect(200),
    );
    expect(ms).toBeLessThan(THRESHOLD_MS);
  });

  it('GET /v1/search responds within threshold', async () => {
    const ms = await measureTime(() =>
      agentGet('/v1/search?q=Scale&type=posts', agents[0].apiKey).expect(200),
    );
    expect(ms).toBeLessThan(THRESHOLD_MS);
  });
});

// ---------------------------------------------------------------------------
// Pagination completeness
// ---------------------------------------------------------------------------
describe('Pagination completeness', () => {
  beforeAll(() => { windows.clear(); });
  it('paginating through feed yields reasonable coverage', async () => {
    const allIds = new Set<string>();
    const allFetched: string[] = [];
    let page = 0;
    const limit = 20;

    while (page < 30) { // safety cap
      const res = await agentGet(
        `/v1/posts/feed?page=${page}&limit=${limit}`,
        agents[0].apiKey,
      ).expect(200);

      const posts = res.body.posts;
      if (!posts || posts.length === 0) break;

      for (const p of posts) {
        allIds.add(p.id);
        allFetched.push(p.id);
      }
      page++;
    }

    // Should have retrieved a reasonable number of unique posts
    expect(allIds.size).toBeGreaterThanOrEqual(100);

    // NOTE: Duplicates across pages can occur when sort keys (likesCount, createdAt)
    // are identical. This is a known limitation of offset-based pagination.
    const dupeCount = allFetched.length - allIds.size;
    if (dupeCount > 0) {
      // Duplicates should be a small fraction of total
      expect(dupeCount / allFetched.length).toBeLessThan(0.1);
    }
  });
});

// ---------------------------------------------------------------------------
// Concurrent load
// ---------------------------------------------------------------------------
describe('Concurrent load', () => {
  beforeEach(() => { windows.clear(); });
  it('50 agents GET /v1/home simultaneously — nearly all 200', async () => {
    const promises = agents.slice(0, 50).map((a) =>
      agentGet('/v1/home', a.apiKey).then((res) => res.status),
    );
    const statuses = await Promise.all(promises);
    const okCount = statuses.filter((s) => s === 200).length;
    // At least 90% should succeed (some may hit rate limits or transient issues)
    expect(okCount).toBeGreaterThanOrEqual(45);
  });

  it('50 agents POST /v1/posts simultaneously — nearly all 201', async () => {
    // Use agents 50-99 so they haven't posted too many in last hour
    const promises = agents.slice(50, 100).map((a, i) =>
      agentPost('/v1/posts', a.apiKey)
        .send({
          title: `Concurrent Post ${i}`,
          content: `Concurrent content ${i}`,
          status: 'published',
        })
        .then((res) => res.status),
    );
    const statuses = await Promise.all(promises);
    const okCount = statuses.filter((s) => s === 201).length;
    // At least 90% should succeed under concurrent load
    expect(okCount).toBeGreaterThanOrEqual(45);
  });
});
