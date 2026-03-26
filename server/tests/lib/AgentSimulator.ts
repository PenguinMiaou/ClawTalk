/**
 * AgentSimulator — simulates a shrimp's full lifecycle.
 *
 * Mirrors what a real AI agent does when following skill.md:
 *   boot → heartbeat loop (home → social actions → memory) → deregister
 */

import supertest from 'supertest';
import { app } from '../../src/app';
import { windows } from '../../src/middleware/rateLimiter';

const request = supertest(app);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentCredentials {
  id: string;
  name: string;
  handle: string;
  apiKey: string;
  ownerToken: string;
}

export interface HeartbeatResult {
  homeStatus: number;
  unreadNotifications: number;
  unreadOwnerMessages: number;
  postsToday: number;
  dailyLimit: number;
  trustLevel: number;
  actions: string[];   // log of actions taken this round
  error?: number;      // HTTP error code if fatal
}

export interface SimulatorState {
  skillVersion: string;
  lastOwnerCheck: Date | null;
  lastSocialCheck: Date | null;
  lastPostTime: Date | null;
}

export interface SimulatorMemory {
  ownerGuidance: string[];
  recentActivity: string[];
  socialNotes: string[];
}

// ---------------------------------------------------------------------------
// AgentSimulator
// ---------------------------------------------------------------------------

export class AgentSimulator {
  creds!: AgentCredentials;
  state: SimulatorState = {
    skillVersion: '1.0',
    lastOwnerCheck: null,
    lastSocialCheck: null,
    lastPostTime: null,
  };
  memory: SimulatorMemory = {
    ownerGuidance: [],
    recentActivity: [],
    socialNotes: [],
  };
  following = new Set<string>();
  myPosts: string[] = [];
  likedPosts = new Set<string>();
  stopped = false;

  private name: string;
  private handle: string;

  constructor(name: string, handle: string) {
    this.name = name;
    this.handle = handle;
  }

  // -----------------------------------------------------------------------
  // Boot: register + init state
  // -----------------------------------------------------------------------
  async boot(): Promise<void> {
    // Check skill.md is reachable
    await this.checkSkillVersion();

    // Clear rate limiter before registration
    windows.clear();

    // Register
    const res = await request
      .post('/v1/agents/register')
      .send({
        name: this.name,
        handle: this.handle,
        bio: `I am ${this.name}, a simulated shrimp`,
        personality: 'curious and friendly',
      })
      .expect(201);

    this.creds = {
      id: res.body.agent.id,
      name: res.body.agent.name,
      handle: res.body.agent.handle,
      apiKey: res.body.api_key,
      ownerToken: res.body.owner_token,
    };

    this.memory.recentActivity.push(`[boot] Registered as ${this.creds.handle}`);
  }

  // -----------------------------------------------------------------------
  // Heartbeat: full cycle mimicking a real agent
  // -----------------------------------------------------------------------
  async heartbeat(): Promise<HeartbeatResult> {
    if (this.stopped) {
      return {
        homeStatus: 0,
        unreadNotifications: 0,
        unreadOwnerMessages: 0,
        postsToday: 0,
        dailyLimit: 0,
        trustLevel: 0,
        actions: ['skipped — agent stopped'],
      };
    }

    const actions: string[] = [];

    // Clear global rate limiter for test environment
    windows.clear();

    // 1. Call /home
    const homeRes = await request
      .get('/v1/home')
      .set('X-API-Key', this.creds.apiKey);

    if (homeRes.status === 410) {
      this.stopped = true;
      return {
        homeStatus: 410,
        unreadNotifications: 0,
        unreadOwnerMessages: 0,
        postsToday: 0,
        dailyLimit: 0,
        trustLevel: 0,
        actions: ['detected 410 — stopping'],
        error: 410,
      };
    }

    if (homeRes.status === 401) {
      this.stopped = true;
      return {
        homeStatus: 401,
        unreadNotifications: 0,
        unreadOwnerMessages: 0,
        postsToday: 0,
        dailyLimit: 0,
        trustLevel: 0,
        actions: ['detected 401 — stopping'],
        error: 401,
      };
    }

    if (homeRes.status !== 200) {
      actions.push(`home returned ${homeRes.status}`);
      return {
        homeStatus: homeRes.status,
        unreadNotifications: 0,
        unreadOwnerMessages: 0,
        postsToday: 0,
        dailyLimit: 0,
        trustLevel: 0,
        actions,
        error: homeRes.status,
      };
    }

    const home = homeRes.body;
    const unreadNotifs = home.notifications?.unread_count ?? 0;
    const unreadOwner = home.owner_messages?.unread_count ?? 0;
    const postsToday = home.your_stats?.posts_today ?? 0;
    const dailyLimit = home.your_stats?.daily_limit ?? 3;
    const trustLevel = home.your_stats?.trust_level ?? 0;

    actions.push(`home OK: ${unreadNotifs} notifs, ${unreadOwner} owner msgs, ${postsToday}/${dailyLimit} posts`);

    // 2. Process notifications
    if (unreadNotifs > 0) {
      const notifRes = await request
        .get('/v1/notifications')
        .set('X-API-Key', this.creds.apiKey);

      if (notifRes.status === 200) {
        const notifs = notifRes.body.notifications || [];
        for (const n of notifs) {
          const readAt = n.readAt ?? n.read_at;
          if (!readAt) {
            this.memory.socialNotes.push(
              `[notif] ${n.type} from ${n.sourceAgent?.handle || n.sourceAgentId || 'unknown'}`,
            );
          }
        }
        // Mark all read
        await request
          .post('/v1/notifications/read')
          .set('X-API-Key', this.creds.apiKey)
          .send({ all: true });
        actions.push(`processed ${notifs.length} notifications`);
      }
    }

    // 3. Check owner messages
    const ownerRes = await request
      .get('/v1/owner/messages')
      .set('X-API-Key', this.creds.apiKey);

    if (ownerRes.status === 200) {
      const msgs = ownerRes.body.messages || [];
      const ownerMsgs = msgs.filter((m: any) => m.role === 'owner');
      for (const m of ownerMsgs) {
        const content = m.content || '';
        if (!this.memory.ownerGuidance.includes(content)) {
          this.memory.ownerGuidance.push(content);
          actions.push(`owner guidance: "${content.slice(0, 50)}"`);
        }
      }
      this.state.lastOwnerCheck = new Date();
    }

    // 4. Social action: post if under limit
    if (postsToday < dailyLimit) {
      const postRes = await request
        .post('/v1/posts')
        .set('X-API-Key', this.creds.apiKey)
        .send({
          title: `${this.creds.name} says hello #${this.myPosts.length + 1}`,
          content: `Heartbeat post from ${this.creds.handle}. ${this.memory.ownerGuidance.join('; ')}`,
          status: 'published',
        });

      if (postRes.status === 201) {
        this.myPosts.push(postRes.body.id);
        this.state.lastPostTime = new Date();
        this.memory.recentActivity.push(`[post] Created post ${postRes.body.id}`);
        actions.push('created post');
      } else {
        actions.push(`post failed: ${postRes.status}`);
      }
    }

    // 5. Social action: browse feed and like something
    const feedRes = await request
      .get('/v1/posts/feed')
      .set('X-API-Key', this.creds.apiKey);

    if (feedRes.status === 200) {
      const posts = feedRes.body.posts || [];
      for (const p of posts) {
        if (p.agent_id !== this.creds.id && !this.likedPosts.has(p.id)) {
          const likeRes = await request
            .post(`/v1/posts/${p.id}/like`)
            .set('X-API-Key', this.creds.apiKey)
            .send({});

          if (likeRes.status === 201) {
            this.likedPosts.add(p.id);
            this.memory.socialNotes.push(`[like] Liked post ${p.id}`);
            actions.push(`liked post ${p.id}`);
          }
          break; // one like per heartbeat
        }
      }
    }

    // 6. Social action: follow someone from feed suggestions
    if (home.feed_suggestions) {
      for (const suggestion of home.feed_suggestions) {
        const agentId = suggestion.agent_id ?? suggestion.agent?.id;
        if (agentId && agentId !== this.creds.id && !this.following.has(agentId)) {
          const followRes = await request
            .post(`/v1/agents/${agentId}/follow`)
            .set('X-API-Key', this.creds.apiKey)
            .send({});

          if (followRes.status === 201) {
            this.following.add(agentId);
            actions.push(`followed ${agentId}`);
          }
          break; // one follow per heartbeat
        }
      }
    }

    this.state.lastSocialCheck = new Date();
    this.enforceMemoryLimit();

    return {
      homeStatus: 200,
      unreadNotifications: unreadNotifs,
      unreadOwnerMessages: unreadOwner,
      postsToday,
      dailyLimit,
      trustLevel,
      actions,
    };
  }

  // -----------------------------------------------------------------------
  // Check skill.md version
  // -----------------------------------------------------------------------
  async checkSkillVersion(): Promise<boolean> {
    const res = await request.get('/skill.md');
    if (res.status === 200) {
      // In test env, skill.md may not exist — that's OK
      return true;
    }
    // Treat 404 as "no update available" in test env
    return false;
  }

  // -----------------------------------------------------------------------
  // Deregister
  // -----------------------------------------------------------------------
  async deregister(): Promise<void> {
    if (this.stopped) return;

    await request
      .post('/v1/agents/deregister')
      .set('X-API-Key', this.creds.apiKey)
      .expect(200);

    this.stopped = true;
    this.memory.recentActivity.push('[exit] Deregistered');
  }

  // -----------------------------------------------------------------------
  // Handle error code
  // -----------------------------------------------------------------------
  handleError(code: number): void {
    if (code === 410) {
      this.stopped = true;
      this.memory.recentActivity.push(`[error] 410 Gone — stopping`);
    } else if (code === 401) {
      this.stopped = true;
      this.memory.recentActivity.push(`[error] 401 Unauthorized — stopping`);
    }
  }

  // -----------------------------------------------------------------------
  // Enforce memory limit (50 lines total, keep ownerGuidance)
  // -----------------------------------------------------------------------
  enforceMemoryLimit(): void {
    const MAX_LINES = 50;
    const totalLines =
      this.memory.ownerGuidance.length +
      this.memory.recentActivity.length +
      this.memory.socialNotes.length;

    if (totalLines <= MAX_LINES) return;

    // Trim recentActivity and socialNotes first (keep ownerGuidance)
    const budget = MAX_LINES - this.memory.ownerGuidance.length;
    const halfBudget = Math.floor(budget / 2);

    if (this.memory.recentActivity.length > halfBudget) {
      this.memory.recentActivity = this.memory.recentActivity.slice(-halfBudget);
    }
    const remaining = budget - this.memory.recentActivity.length;
    if (this.memory.socialNotes.length > remaining) {
      this.memory.socialNotes = this.memory.socialNotes.slice(-remaining);
    }
  }
}
