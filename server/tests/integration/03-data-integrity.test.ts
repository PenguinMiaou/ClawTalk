/**
 * Layer 3 — Data Integrity integration tests.
 *
 * Covers:
 *   1. Like count accuracy (50 like, 10 unlike, 5 re-like)
 *   2. Follow count accuracy (30 follow, 10 unfollow)
 *   3. Cascade on deregister (posts still accessible, follow counts decrease, 410 signaling)
 *   4. Feed consistency (new post in discover, deleted disappears, following feed reflects state)
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
  return `_d${sfxCounter++}`;
}

describe('Layer 3 — Data Integrity', () => {
  beforeAll(async () => {
    clearRateLimits();
    await cleanDb();
  });

  beforeEach(() => {
    clearRateLimits();
  });

  // =========================================================================
  // 1. Like count accuracy
  // =========================================================================
  describe('1. Like count accuracy', () => {
    let author: RegisteredAgent;
    let likers: RegisteredAgent[] = [];
    let postId: string;

    beforeAll(async () => {
      clearRateLimits();
      author = await registerViaAPI(getFixture(0, sfx()));
      clearRateLimits();

      // Move createdAt to past to avoid new-agent throttle
      await prisma.agent.update({
        where: { id: author.id },
        data: { createdAt: new Date(Date.now() - 2 * 3600_000) },
      });
      const post = await createPostViaAPI(author.apiKey);
      postId = post.id;

      // Register 50 likers sequentially
      for (let i = 0; i < 50; i++) {
        clearRateLimits();
        const agent = await registerViaAPI(getFixture(i % 12, sfx()));
        likers.push(agent);
      }
      clearRateLimits();
    }, 120000);

    it('50 agents like a post -> likesCount = 50', async () => {
      for (const liker of likers) {
        clearRateLimits();
        await agentPost(`/v1/posts/${postId}/like`, liker.apiKey).expect(201);
      }

      clearRateLimits();
      const res = await agentGet(`/v1/posts/${postId}`, author.apiKey).expect(200);
      const count = res.body.likes_count ?? res.body.likesCount;
      expect(count).toBe(50);
    }, 120000);

    it('10 unlike -> likesCount = 40', async () => {
      for (let i = 0; i < 10; i++) {
        clearRateLimits();
        await agentDel(`/v1/posts/${postId}/like`, likers[i].apiKey).expect(200);
      }

      clearRateLimits();
      const res = await agentGet(`/v1/posts/${postId}`, author.apiKey).expect(200);
      const count = res.body.likes_count ?? res.body.likesCount;
      expect(count).toBe(40);
    });

    it('5 re-like -> likesCount = 45', async () => {
      for (let i = 0; i < 5; i++) {
        clearRateLimits();
        await agentPost(`/v1/posts/${postId}/like`, likers[i].apiKey).expect(201);
      }

      clearRateLimits();
      const res = await agentGet(`/v1/posts/${postId}`, author.apiKey).expect(200);
      const count = res.body.likes_count ?? res.body.likesCount;
      expect(count).toBe(45);
    });
  });

  // =========================================================================
  // 2. Follow count accuracy
  // =========================================================================
  describe('2. Follow count accuracy', () => {
    let target: RegisteredAgent;
    let followers: RegisteredAgent[] = [];

    beforeAll(async () => {
      clearRateLimits();
      target = await registerViaAPI(getFixture(0, sfx()));
      clearRateLimits();

      // Register 30 followers
      for (let i = 0; i < 30; i++) {
        clearRateLimits();
        const agent = await registerViaAPI(getFixture(i % 12, sfx()));
        followers.push(agent);
      }
      clearRateLimits();
    }, 120000);

    it('30 agents follow target -> followers_count = 30', async () => {
      for (const f of followers) {
        clearRateLimits();
        await agentPost(`/v1/agents/${target.id}/follow`, f.apiKey).expect(201);
      }

      clearRateLimits();
      const res = await agentGet('/v1/agents/me', target.apiKey).expect(200);
      const count = res.body.followers_count ?? res.body.followersCount;
      expect(count).toBe(30);
    }, 120000);

    it('10 unfollow -> followers_count = 20', async () => {
      for (let i = 0; i < 10; i++) {
        clearRateLimits();
        await agentDel(`/v1/agents/${target.id}/follow`, followers[i].apiKey).expect(200);
      }

      clearRateLimits();
      const res = await agentGet('/v1/agents/me', target.apiKey).expect(200);
      const count = res.body.followers_count ?? res.body.followersCount;
      expect(count).toBe(20);
    });
  });

  // =========================================================================
  // 3. Cascade on deregister
  // =========================================================================
  describe('3. Cascade on deregister', () => {
    let doomed: RegisteredAgent;
    let observer: RegisteredAgent;
    let doomedPostId: string;

    beforeAll(async () => {
      clearRateLimits();
      doomed = await registerViaAPI(getFixture(5, sfx()));
      clearRateLimits();
      observer = await registerViaAPI(getFixture(6, sfx()));
      clearRateLimits();

      // Move createdAt to past to avoid throttle
      await prisma.agent.update({
        where: { id: doomed.id },
        data: { createdAt: new Date(Date.now() - 2 * 3600_000) },
      });
      await prisma.agent.update({
        where: { id: observer.id },
        data: { createdAt: new Date(Date.now() - 2 * 3600_000) },
      });

      // Doomed creates a post
      const post = await createPostViaAPI(doomed.apiKey);
      doomedPostId = post.id;

      // Observer follows doomed
      await agentPost(`/v1/agents/${doomed.id}/follow`, observer.apiKey).expect(201);
    });

    it('observer following_count = 1 before deregister', async () => {
      const res = await agentGet('/v1/agents/me', observer.apiKey).expect(200);
      const count = res.body.following_count ?? res.body.followingCount;
      expect(count).toBe(1);
    });

    it('doomed deregisters', async () => {
      await agentPost('/v1/agents/deregister', doomed.apiKey).expect(200);
    });

    it('doomed post still accessible via API', async () => {
      clearRateLimits();
      const res = await agentGet(`/v1/posts/${doomedPostId}`, observer.apiKey);
      // Post should still be accessible (soft delete on agent, not on posts)
      expect(res.status).toBe(200);
    });

    it('all API calls by doomed -> 410', async () => {
      await agentGet('/v1/agents/me', doomed.apiKey).expect(410);
      await agentGet('/v1/home', doomed.apiKey).expect(410);
      await agentPost('/v1/posts', doomed.apiKey)
        .send({ title: 'X', content: 'Y' })
        .expect(410);
    });

    it('owner token for doomed -> 410', async () => {
      await ownerGet('/v1/agents/me', doomed.ownerToken).expect(410);
    });

    it('observer following_count reflects deregister state', async () => {
      // Follow records are now cascade-deleted on deregister
      const res = await agentGet('/v1/agents/me', observer.apiKey).expect(200);
      const count = res.body.following_count ?? res.body.followingCount;
      expect(count).toBe(0);
    });
  });

  // =========================================================================
  // 4. Feed consistency
  // =========================================================================
  describe('4. Feed consistency', () => {
    let feedAuthor: RegisteredAgent;
    let feedReader: RegisteredAgent;

    beforeAll(async () => {
      clearRateLimits();
      feedAuthor = await registerViaAPI(getFixture(7, sfx()));
      clearRateLimits();
      feedReader = await registerViaAPI(getFixture(8, sfx()));
      clearRateLimits();

      // Move createdAt to past to avoid throttle
      await prisma.agent.update({
        where: { id: feedAuthor.id },
        data: { createdAt: new Date(Date.now() - 2 * 3600_000) },
      });
    });

    it('new post appears in discover feed', async () => {
      clearRateLimits();
      const post = await createPostViaAPI(feedAuthor.apiKey, {
        title: 'Discover Me',
        content: 'I should appear in discover feed',
      });

      clearRateLimits();
      const res = await agentGet('/v1/posts/feed', feedReader.apiKey).expect(200);
      const posts = res.body.posts ?? res.body;
      const ids = posts.map((p: any) => p.id);
      expect(ids).toContain(post.id);
    });

    it('removed post disappears from discover feed', async () => {
      clearRateLimits();
      const post = await createPostViaAPI(feedAuthor.apiKey, {
        title: 'Delete Me',
        content: 'I should disappear from discover feed',
      });

      // Verify it appears first
      clearRateLimits();
      let res = await agentGet('/v1/posts/feed?limit=50', feedReader.apiKey).expect(200);
      let ids = (res.body.posts ?? res.body).map((p: any) => p.id);
      expect(ids).toContain(post.id);

      // Delete the post
      clearRateLimits();
      await agentDel(`/v1/posts/${post.id}`, feedAuthor.apiKey).expect(200);

      // Verify it no longer appears
      clearRateLimits();
      res = await agentGet('/v1/posts/feed?limit=50', feedReader.apiKey).expect(200);
      ids = (res.body.posts ?? res.body).map((p: any) => p.id);
      expect(ids).not.toContain(post.id);
    });

    it('following feed reflects follow/unfollow', async () => {
      // NOTE: When following nobody, getFollowingFeed falls back to discover feed.
      // So we need a third agent to follow first, so the following feed is scoped.
      clearRateLimits();
      const dummy = await registerViaAPI(getFixture(9, sfx()));
      clearRateLimits();

      // Reader follows dummy first so following feed doesn't fall back to discover
      await agentPost(`/v1/agents/${dummy.id}/follow`, feedReader.apiKey).expect(201);

      clearRateLimits();
      const post = await createPostViaAPI(feedAuthor.apiKey, {
        title: 'Following Test',
        content: 'Should appear when followed',
      });

      // Reader is following dummy but NOT feedAuthor -> post should NOT appear
      clearRateLimits();
      let res = await agentGet('/v1/posts/feed?filter=following', feedReader.apiKey).expect(200);
      let posts = res.body.posts ?? res.body;
      let ids = posts.map((p: any) => p.id);
      expect(ids).not.toContain(post.id);

      // Reader follows feedAuthor
      clearRateLimits();
      await agentPost(`/v1/agents/${feedAuthor.id}/follow`, feedReader.apiKey).expect(201);

      // Following feed should now contain the post
      clearRateLimits();
      res = await agentGet('/v1/posts/feed?filter=following', feedReader.apiKey).expect(200);
      posts = res.body.posts ?? res.body;
      ids = posts.map((p: any) => p.id);
      expect(ids).toContain(post.id);

      // Reader unfollows feedAuthor
      clearRateLimits();
      await agentDel(`/v1/agents/${feedAuthor.id}/follow`, feedReader.apiKey).expect(200);

      // Following feed should no longer contain the post (still follows dummy)
      clearRateLimits();
      res = await agentGet('/v1/posts/feed?filter=following', feedReader.apiKey).expect(200);
      posts = res.body.posts ?? res.body;
      ids = posts.map((p: any) => p.id);
      expect(ids).not.toContain(post.id);
    });
  });
});
