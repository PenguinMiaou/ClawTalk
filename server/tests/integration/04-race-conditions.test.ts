/**
 * Layer 4 — Race Conditions integration tests.
 *
 * Covers:
 *   1. Concurrent likes (10 agents Promise.all like same post)
 *   2. Concurrent comments (10 agents Promise.all comment)
 *   3. Mutual follow (A and B follow each other simultaneously)
 *   4. Duplicate handle registration (two concurrent registrations)
 *   5. Long poll isolation (message sent to one, others don't receive)
 */

import {
  request,
  prisma,
  cleanDb,
  registerViaAPI,
  agentGet,
  agentPost,
  ownerPost,
  createPostViaAPI,
  RegisteredAgent,
} from '../helpers';
import { getFixture } from '../fixtures/agents';
import { windows } from '../../src/middleware/rateLimiter';

function clearRateLimits() {
  windows.clear();
}

/** Short unique suffix to keep handles under 20 chars */
let sfxCounter = 0;
function sfx() {
  return `_r${sfxCounter++}`;
}

describe('Layer 4 — Race Conditions', () => {
  beforeAll(async () => {
    clearRateLimits();
    await cleanDb();
  });

  beforeEach(() => {
    clearRateLimits();
  });

  // =========================================================================
  // 1. Concurrent likes
  // =========================================================================
  describe('1. Concurrent likes', () => {
    let author: RegisteredAgent;
    let likers: RegisteredAgent[] = [];
    let postId: string;

    beforeAll(async () => {
      clearRateLimits();
      author = await registerViaAPI(getFixture(0, sfx()));
      clearRateLimits();

      // Move createdAt to past to avoid throttle
      await prisma.agent.update({
        where: { id: author.id },
        data: { createdAt: new Date(Date.now() - 2 * 3600_000) },
      });

      const post = await createPostViaAPI(author.apiKey);
      postId = post.id;

      // Register 10 likers sequentially
      for (let i = 0; i < 10; i++) {
        clearRateLimits();
        likers.push(await registerViaAPI(getFixture(i % 12, sfx())));
      }
      clearRateLimits();
    }, 60000);

    it('10 concurrent likes -> count = number of 201s, no duplicates', async () => {
      clearRateLimits();
      const results = await Promise.all(
        likers.map((liker) =>
          agentPost(`/v1/posts/${postId}/like`, liker.apiKey).then((r) => r.status)
        ),
      );

      const successes = results.filter((s) => s === 201).length;
      const conflicts = results.filter((s) => s === 409).length;
      // All should succeed since each agent likes only once
      expect(successes + conflicts).toBe(10);
      expect(successes).toBeGreaterThanOrEqual(8);

      // Verify the count matches
      clearRateLimits();
      const res = await agentGet(`/v1/posts/${postId}`, author.apiKey).expect(200);
      const count = res.body.likes_count ?? res.body.likesCount;
      expect(count).toBe(successes);

      // Verify no duplicates in the database
      const likes = await prisma.like.findMany({
        where: { targetId: postId, targetType: 'post' },
      });
      const agentIds = likes.map((l) => l.agentId);
      const uniqueAgentIds = new Set(agentIds);
      expect(uniqueAgentIds.size).toBe(agentIds.length);
    });
  });

  // =========================================================================
  // 2. Concurrent comments
  // =========================================================================
  describe('2. Concurrent comments', () => {
    let author: RegisteredAgent;
    let commenters: RegisteredAgent[] = [];
    let postId: string;

    beforeAll(async () => {
      clearRateLimits();
      author = await registerViaAPI(getFixture(0, sfx()));
      clearRateLimits();

      await prisma.agent.update({
        where: { id: author.id },
        data: { createdAt: new Date(Date.now() - 2 * 3600_000) },
      });

      const post = await createPostViaAPI(author.apiKey);
      postId = post.id;

      // Register 10 commenters - move createdAt to past to avoid new-agent throttle
      for (let i = 0; i < 10; i++) {
        clearRateLimits();
        const agent = await registerViaAPI(getFixture(i % 12, sfx()));
        await prisma.agent.update({
          where: { id: agent.id },
          data: { createdAt: new Date(Date.now() - 2 * 3600_000) },
        });
        commenters.push(agent);
      }
      clearRateLimits();
    }, 60000);

    it('10 concurrent comments -> all created, commentsCount = 10', async () => {
      clearRateLimits();
      const results = await Promise.all(
        commenters.map((c, i) =>
          agentPost(`/v1/posts/${postId}/comments`, c.apiKey)
            .send({ content: `Comment ${i}` })
            .then((r) => ({ status: r.status, body: r.body }))
        ),
      );

      const successes = results.filter((r) => r.status === 201);
      expect(successes.length).toBe(10);

      // Verify comments count on the post
      clearRateLimits();
      const res = await agentGet(`/v1/posts/${postId}`, author.apiKey).expect(200);
      const count = res.body.comments_count ?? res.body.commentsCount;
      expect(count).toBe(10);

      // Verify all comments exist in DB
      const comments = await prisma.comment.findMany({ where: { postId } });
      expect(comments.length).toBe(10);
    });
  });

  // =========================================================================
  // 3. Mutual follow
  // =========================================================================
  describe('3. Mutual follow', () => {
    let agentA: RegisteredAgent;
    let agentB: RegisteredAgent;

    beforeAll(async () => {
      clearRateLimits();
      agentA = await registerViaAPI(getFixture(0, sfx()));
      clearRateLimits();
      agentB = await registerViaAPI(getFixture(1, sfx()));
      clearRateLimits();
    });

    it('A and B follow each other simultaneously -> both succeed, counts correct', async () => {
      clearRateLimits();
      const [resAB, resBA] = await Promise.all([
        agentPost(`/v1/agents/${agentB.id}/follow`, agentA.apiKey),
        agentPost(`/v1/agents/${agentA.id}/follow`, agentB.apiKey),
      ]);

      // Both should succeed
      expect(resAB.status).toBe(201);
      expect(resBA.status).toBe(201);

      // A should have 1 follower (B) and 1 following (B)
      clearRateLimits();
      const resA = await agentGet('/v1/agents/me', agentA.apiKey).expect(200);
      expect(resA.body.followers_count ?? resA.body.followersCount).toBe(1);
      expect(resA.body.following_count ?? resA.body.followingCount).toBe(1);

      // B should have 1 follower (A) and 1 following (A)
      clearRateLimits();
      const resB = await agentGet('/v1/agents/me', agentB.apiKey).expect(200);
      expect(resB.body.followers_count ?? resB.body.followersCount).toBe(1);
      expect(resB.body.following_count ?? resB.body.followingCount).toBe(1);
    });
  });

  // =========================================================================
  // 4. Duplicate handle registration
  // =========================================================================
  describe('4. Duplicate handle registration', () => {
    it('two concurrent registrations with same handle -> one 201, one 409 or 500', async () => {
      clearRateLimits();
      const handle = 'race_handle_t';

      const [res1, res2] = await Promise.all([
        request.post('/v1/agents/register').send({
          name: 'Racer One',
          handle,
          bio: 'first',
          personality: 'test',
        }),
        request.post('/v1/agents/register').send({
          name: 'Racer Two',
          handle,
          bio: 'second',
          personality: 'test',
        }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      // One should succeed, the other should fail
      // The race may produce: 201+409 (checked first), or 201+500 (unique constraint at DB)
      expect(statuses).toContain(201);
      // The loser gets 409 (app-level) or 500 (DB-level unique violation)
      const loserStatus = statuses.find((s) => s !== 201);
      expect([409, 500]).toContain(loserStatus);

      // Verify only one agent exists with this handle
      const agents = await prisma.agent.findMany({ where: { handle } });
      expect(agents.length).toBe(1);
    });
  });

  // =========================================================================
  // 5. Long poll isolation
  // =========================================================================
  describe('5. Long poll isolation', () => {
    let agents: RegisteredAgent[] = [];

    beforeAll(async () => {
      clearRateLimits();
      for (let i = 0; i < 5; i++) {
        clearRateLimits();
        agents.push(await registerViaAPI(getFixture(i, sfx())));
      }
      clearRateLimits();
    });

    it('message to agent 0 -> only agent 0 receives it, others timeout empty', async () => {
      clearRateLimits();

      // Start long polls for all 5 agents with short timeout
      const pollPromises = agents.map((a) =>
        agentGet('/v1/owner/messages/listen?timeout=3', a.apiKey)
          .then((r) => ({ agentId: a.id, messages: r.body.messages }))
      );

      // Brief delay to let polls register
      await new Promise((r) => setTimeout(r, 300));

      // Owner sends message to agent 0 only
      await ownerPost('/v1/owner/messages', agents[0].ownerToken)
        .send({ content: 'Private message for agent 0', message_type: 'text' })
        .expect(201);

      // Wait for all polls to resolve
      const results = await Promise.all(pollPromises);

      // Agent 0 should have received the message
      const agent0Result = results.find((r) => r.agentId === agents[0].id);
      expect(agent0Result).toBeDefined();
      expect(agent0Result!.messages.length).toBeGreaterThanOrEqual(1);

      // Other agents should have empty messages (timeout)
      for (let i = 1; i < 5; i++) {
        const result = results.find((r) => r.agentId === agents[i].id);
        expect(result).toBeDefined();
        expect(result!.messages.length).toBe(0);
      }
    }, 15000);
  });
});
