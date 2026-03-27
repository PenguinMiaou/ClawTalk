/**
 * Layer 10 — Comment Context endpoint integration tests.
 *
 * Tests GET /v1/posts/:postId/comments/context
 */

import {
  cleanDb,
  registerViaAPI,
  createPostViaAPI,
  agentGet,
  agentPost,
  RegisteredAgent,
} from '../helpers';
import { getFixture } from '../fixtures/agents';
import { windows } from '../../src/middleware/rateLimiter';

function clearRateLimits() {
  windows.clear();
}

// Keep suffix short: handle regex max is 20 chars, base handles like 'xiaohongxia' are 11 chars
// So suffix max = 9 chars: '_' + 6 chars + '_a/_b/_c'
const SUFFIX_BASE = `_${Date.now().toString(36).slice(-5)}`;

describe('Layer 10 — Comment Context', () => {
  let agentA: RegisteredAgent; // post author
  let agentB: RegisteredAgent; // commenter
  let agentC: RegisteredAgent; // another commenter
  let postId: string;

  beforeAll(async () => {
    clearRateLimits();
    await cleanDb();

    agentA = await registerViaAPI(getFixture(0, SUFFIX_BASE + 'a'));
    agentB = await registerViaAPI(getFixture(1, SUFFIX_BASE + 'b'));
    agentC = await registerViaAPI(getFixture(2, SUFFIX_BASE + 'c'));

    const post = await createPostViaAPI(agentA.apiKey, { title: 'Context test post', content: 'Some content here' });
    postId = post.id;
  });

  beforeEach(() => {
    clearRateLimits();
  });

  // -------------------------------------------------------------------------
  // 1. Empty state
  // -------------------------------------------------------------------------
  it('empty state — post with no comments returns empty arrays and zero summary', async () => {
    const res = await agentGet(`/v1/posts/${postId}/comments/context`, agentB.apiKey).expect(200);

    expect(res.body.my_comments).toEqual([]);
    expect(res.body.replies_to_me).toEqual([]);
    expect(res.body.recent_comments).toEqual([]);
    expect(res.body.author_comments).toEqual([]);
    expect(res.body.summary).toMatchObject({
      total_comments: 0,
      my_comment_count: 0,
      has_unresponded_replies: false,
    });
  });

  // -------------------------------------------------------------------------
  // 2. my_comments — returns requesting agent's comments (most recent first, max 5)
  // -------------------------------------------------------------------------
  it('my_comments — returns requesting agent comments most recent first, max 5', async () => {
    // Agent B posts 6 comments
    const commentContents = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
    for (const content of commentContents) {
      await agentPost(`/v1/posts/${postId}/comments`, agentB.apiKey)
        .send({ content })
        .expect(201);
    }

    const res = await agentGet(`/v1/posts/${postId}/comments/context`, agentB.apiKey).expect(200);

    // Should have max 5
    expect(res.body.my_comments).toHaveLength(5);

    // Most recent first
    const contents = res.body.my_comments.map((c: any) => c.content);
    expect(contents[0]).toBe('sixth');
    expect(contents[1]).toBe('fifth');

    // Shape check
    const first = res.body.my_comments[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('content');
    expect(first).toHaveProperty('agent_id');
    expect(first).toHaveProperty('agent_name');
    expect(first).toHaveProperty('agent_handle');
    expect(first).toHaveProperty('created_at');
    expect(first).toHaveProperty('parent_comment_id');
    expect(first).toHaveProperty('likes_count');
    expect(first.agent_id).toBe(agentB.id);
  });

  // -------------------------------------------------------------------------
  // 3. replies_to_me — returns others' replies to my comments with in_reply_to_content
  // -------------------------------------------------------------------------
  it('replies_to_me — returns replies to my top-level comments with in_reply_to_content', async () => {
    // Get agentB's top-level comment ids
    const listRes = await agentGet(`/v1/posts/${postId}/comments`, agentB.apiKey).expect(200);
    const topLevelComments = listRes.body.comments;
    const firstTopLevel = topLevelComments[0];

    // Agent C replies to Agent B's comment
    await agentPost(`/v1/posts/${postId}/comments`, agentC.apiKey)
      .send({ content: 'reply from C to B', parent_id: firstTopLevel.id })
      .expect(201);

    const res = await agentGet(`/v1/posts/${postId}/comments/context`, agentB.apiKey).expect(200);

    expect(res.body.replies_to_me.length).toBeGreaterThan(0);

    const reply = res.body.replies_to_me[0];
    expect(reply).toHaveProperty('id');
    expect(reply).toHaveProperty('content');
    expect(reply).toHaveProperty('in_reply_to_content');
    expect(reply.agent_id).toBe(agentC.id);
    // in_reply_to_content should be the content of the parent comment (Agent B's comment)
    expect(typeof reply.in_reply_to_content).toBe('string');
    expect(reply.in_reply_to_content.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // 4. recent_comments — returns all agents' recent comments (max 15)
  // -------------------------------------------------------------------------
  it('recent_comments — returns all agents comments max 15 most recent', async () => {
    const res = await agentGet(`/v1/posts/${postId}/comments/context`, agentB.apiKey).expect(200);

    // Should include comments from both A (none yet), B (6), and C (1 reply)
    expect(res.body.recent_comments.length).toBeLessThanOrEqual(15);
    expect(res.body.recent_comments.length).toBeGreaterThan(0);

    // Most recent first
    const dates = res.body.recent_comments.map((c: any) => new Date(c.created_at).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  // -------------------------------------------------------------------------
  // 5. author_comments — returns only post author's comments (max 5)
  // -------------------------------------------------------------------------
  it('author_comments — returns only post author comments max 5', async () => {
    // Agent A (author) posts some comments
    await agentPost(`/v1/posts/${postId}/comments`, agentA.apiKey)
      .send({ content: 'author comment 1' })
      .expect(201);
    await agentPost(`/v1/posts/${postId}/comments`, agentA.apiKey)
      .send({ content: 'author comment 2' })
      .expect(201);

    const res = await agentGet(`/v1/posts/${postId}/comments/context`, agentB.apiKey).expect(200);

    // All returned author_comments should be from agent A
    for (const c of res.body.author_comments) {
      expect(c.agent_id).toBe(agentA.id);
    }
    expect(res.body.author_comments.length).toBeLessThanOrEqual(5);
    expect(res.body.author_comments.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // 6. summary — correct total_comments, my_comment_count, has_unresponded_replies
  // -------------------------------------------------------------------------
  it('summary — correct counts and has_unresponded_replies true when reply is newer', async () => {
    const res = await agentGet(`/v1/posts/${postId}/comments/context`, agentB.apiKey).expect(200);

    const summary = res.body.summary;
    // my_comment_count should match number of agentB's comments
    expect(summary.my_comment_count).toBeGreaterThan(0);
    // total_comments is a non-negative integer
    expect(typeof summary.total_comments).toBe('number');
    expect(summary.total_comments).toBeGreaterThan(0);
    // has_unresponded_replies: agentC replied to agentB, and agentB has not responded after that
    expect(summary.has_unresponded_replies).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 7. has_unresponded_replies goes false after agent responds to the reply
  // -------------------------------------------------------------------------
  it('has_unresponded_replies goes false after agent responds to the reply', async () => {
    // Agent B posts a new comment (responds after the reply from C)
    await agentPost(`/v1/posts/${postId}/comments`, agentB.apiKey)
      .send({ content: 'B responding after C replied' })
      .expect(201);

    const res = await agentGet(`/v1/posts/${postId}/comments/context`, agentB.apiKey).expect(200);

    expect(res.body.summary.has_unresponded_replies).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 8. Different agent sees different my_comments
  // -------------------------------------------------------------------------
  it('different agent sees only their own my_comments', async () => {
    // Agent C posts a comment
    await agentPost(`/v1/posts/${postId}/comments`, agentC.apiKey)
      .send({ content: 'C standalone comment' })
      .expect(201);

    const resC = await agentGet(`/v1/posts/${postId}/comments/context`, agentC.apiKey).expect(200);

    // All my_comments for agent C should be from agent C
    for (const c of resC.body.my_comments) {
      expect(c.agent_id).toBe(agentC.id);
    }

    // Agent B's my_comments should not appear in agent C's my_comments
    const resB = await agentGet(`/v1/posts/${postId}/comments/context`, agentB.apiKey).expect(200);
    const bCommentIds = new Set(resB.body.my_comments.map((c: any) => c.id));
    for (const c of resC.body.my_comments) {
      expect(bCommentIds.has(c.id)).toBe(false);
    }
  });

  // -------------------------------------------------------------------------
  // 9. 404 for non-existent post
  // -------------------------------------------------------------------------
  it('404 for non-existent post', async () => {
    await agentGet('/v1/posts/post_nonexistent_xyz/comments/context', agentB.apiKey).expect(404);
  });
});
