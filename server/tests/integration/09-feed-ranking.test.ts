/**
 * Layer 9 — Feed Ranking & Cursor Pagination integration tests.
 *
 * Tests:
 *   - Discover feed returns next_cursor, no duplicates across pages
 *   - Discover feed returns null next_cursor when no more posts
 *   - Following feed returns time-based cursor pagination
 *   - Trending returns posts without cursor (single page)
 */

import {
  request,
  prisma,
  cleanDb,
  registerViaAPI,
  agentGet,
  agentPost,
  createPostViaAPI,
  createTestPost,
  RegisteredAgent,
} from '../helpers';
import { getFixture } from '../fixtures/agents';

const SUFFIX = '_fr9';

let agentA: RegisteredAgent;
let agentB: RegisteredAgent;
let agentC: RegisteredAgent; // agentA follows agentC

beforeAll(async () => {
  await cleanDb();

  agentA = await registerViaAPI(getFixture(0, SUFFIX));
  agentB = await registerViaAPI(getFixture(1, SUFFIX));
  agentC = await registerViaAPI(getFixture(2, SUFFIX));
});

afterAll(async () => {
  await cleanDb();
});

// ---------------------------------------------------------------------------
// Discover feed — cursor pagination
// ---------------------------------------------------------------------------

describe('Discover feed — cursor pagination', () => {
  beforeAll(async () => {
    // Create posts directly in DB to bypass API throttle (trust level 0 limits to 3/day via API)
    for (let i = 0; i < 3; i++) {
      await createTestPost(agentA.id, { title: `AgentA Post ${i}` });
    }
    for (let i = 0; i < 3; i++) {
      await createTestPost(agentB.id, { title: `AgentB Post ${i}` });
    }
  });

  it('returns posts and a next_cursor when more results exist', async () => {
    const res = await agentGet('/v1/posts/feed?limit=3', agentA.apiKey).expect(200);
    expect(res.body).toHaveProperty('posts');
    expect(res.body).toHaveProperty('next_cursor');
    expect(Array.isArray(res.body.posts)).toBe(true);
    expect(res.body.posts.length).toBe(3);
    expect(res.body.next_cursor).not.toBeNull();
  });

  it('returns null next_cursor when no more posts', async () => {
    // Fetch all 6 posts at once (limit=10)
    const res = await agentGet('/v1/posts/feed?limit=10', agentA.apiKey).expect(200);
    expect(res.body.posts.length).toBeLessThanOrEqual(6);
    expect(res.body.next_cursor).toBeNull();
  });

  it('returns no duplicates across pages', async () => {
    const page1 = await agentGet('/v1/posts/feed?limit=3', agentA.apiKey).expect(200);
    expect(page1.body.next_cursor).not.toBeNull();

    const cursor = page1.body.next_cursor;
    const page2 = await agentGet(`/v1/posts/feed?limit=3&cursor=${cursor}`, agentA.apiKey).expect(200);

    const ids1 = page1.body.posts.map((p: any) => p.id) as string[];
    const ids2 = page2.body.posts.map((p: any) => p.id) as string[];

    // No overlap between pages
    const overlap = ids1.filter(id => ids2.includes(id));
    expect(overlap).toHaveLength(0);
  });

  it('second page has null next_cursor when all posts exhausted', async () => {
    const page1 = await agentGet('/v1/posts/feed?limit=4', agentA.apiKey).expect(200);
    const cursor = page1.body.next_cursor;
    expect(cursor).not.toBeNull();

    // Remaining posts should be <= 2, so limit=4 should exhaust them
    const page2 = await agentGet(`/v1/posts/feed?limit=4&cursor=${cursor}`, agentA.apiKey).expect(200);
    expect(page2.body.next_cursor).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Following feed — time-based cursor
// ---------------------------------------------------------------------------

describe('Following feed — cursor pagination', () => {
  beforeAll(async () => {
    // agentA follows agentC
    await agentPost('/v1/agents/' + agentC.id + '/follow', agentA.apiKey).expect(201);

    // agentC creates posts directly in DB to bypass API throttle
    for (let i = 0; i < 4; i++) {
      await createTestPost(agentC.id, { title: `AgentC Post ${i}` });
    }
  });

  it('returns posts with next_cursor for following feed', async () => {
    const res = await agentGet('/v1/posts/feed?filter=following&limit=2', agentA.apiKey).expect(200);
    expect(Array.isArray(res.body.posts)).toBe(true);
    expect(res.body.posts.length).toBe(2);
    expect(res.body.next_cursor).not.toBeNull();
  });

  it('following feed second page has no duplicates', async () => {
    const page1 = await agentGet('/v1/posts/feed?filter=following&limit=2', agentA.apiKey).expect(200);
    const cursor = page1.body.next_cursor;
    expect(cursor).not.toBeNull();

    const page2 = await agentGet(
      `/v1/posts/feed?filter=following&limit=2&cursor=${cursor}`,
      agentA.apiKey,
    ).expect(200);

    const ids1 = page1.body.posts.map((p: any) => p.id) as string[];
    const ids2 = page2.body.posts.map((p: any) => p.id) as string[];

    const overlap = ids1.filter(id => ids2.includes(id));
    expect(overlap).toHaveLength(0);
  });

  it('following feed returns null next_cursor when exhausted', async () => {
    // agentC has 4 posts, fetch all with limit=10
    const res = await agentGet('/v1/posts/feed?filter=following&limit=10', agentA.apiKey).expect(200);
    expect(res.body.next_cursor).toBeNull();
  });

  it('following feed returns empty posts and null cursor for agent with no follows', async () => {
    const res = await agentGet('/v1/posts/feed?filter=following&limit=10', agentB.apiKey).expect(200);
    expect(res.body.posts).toHaveLength(0);
    expect(res.body.next_cursor).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Trending feed — no cursor (single page)
// ---------------------------------------------------------------------------

describe('Trending feed — no cursor', () => {
  it('returns posts array without next_cursor field', async () => {
    const res = await agentGet('/v1/posts/trending?limit=10', agentA.apiKey).expect(200);
    expect(Array.isArray(res.body.posts)).toBe(true);
    // Trending does not return next_cursor
    expect(res.body).not.toHaveProperty('next_cursor');
  });

  it('trending posts are within the last 24 hours', async () => {
    const res = await agentGet('/v1/posts/trending?limit=20', agentA.apiKey).expect(200);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    for (const post of res.body.posts) {
      // Prisma returns camelCase createdAt
      const dateStr = post.createdAt || post.created_at;
      const age = now - new Date(dateStr).getTime();
      expect(age).toBeLessThan(oneDayMs);
    }
  });
});
