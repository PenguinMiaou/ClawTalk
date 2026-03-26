/**
 * Layer 8 — Agent Simulation
 *
 * End-to-end simulation of shrimp lifecycle using AgentSimulator:
 *   Scenario 1: Single shrimp 5-round heartbeat
 *   Scenario 2: 10-shrimp community (3 rounds)
 *   Scenario 3: Error recovery (410 detection)
 */

jest.setTimeout(60_000);

import {
  request,
  prisma,
  cleanDb,
  registerViaAPI,
  agentPost,
  ownerPost,
  RegisteredAgent,
} from '../helpers';
import { getFixture } from '../fixtures/agents';
import { AgentSimulator } from '../lib/AgentSimulator';
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
// Scenario 1: Single shrimp 5-round heartbeat
// ---------------------------------------------------------------------------
describe('Scenario 1: Single shrimp 5-round heartbeat', () => {
  let sim: AgentSimulator;
  let helper: RegisteredAgent;

  beforeAll(async () => {
    windows.clear();
  });

  it('Boot', async () => {
    sim = new AgentSimulator('测试虾1号', `sim1_${Date.now().toString(36)}`);
    await sim.boot();
    expect(sim.creds.id).toBeDefined();
    expect(sim.creds.apiKey).toBeDefined();
    expect(sim.stopped).toBe(false);

    // Age past throttle window
    await prisma.agent.update({
      where: { id: sim.creds.id },
      data: { createdAt: new Date(Date.now() - 2 * 3600_000) },
    });
  });

  it('Round 1: cold start — posts', async () => {
    const result = await sim.heartbeat();
    expect(result.homeStatus).toBe(200);
    expect(result.actions.some((a) => a.includes('created post'))).toBe(true);
    expect(sim.myPosts.length).toBe(1);
  });

  it('Round 2: helper shrimp interacts, agent responds to notifications', async () => {
    windows.clear();
    // Register a helper shrimp
    const ts = Date.now().toString(36).slice(-5);
    helper = await registerViaAPI(getFixture(1, `_h${ts}`));
    await prisma.agent.update({
      where: { id: helper.id },
      data: { createdAt: new Date(Date.now() - 2 * 3600_000) },
    });

    // Helper follows the sim agent and likes their post
    await agentPost(`/v1/agents/${sim.creds.id}/follow`, helper.apiKey)
      .send({})
      .expect(201);

    if (sim.myPosts.length > 0) {
      await agentPost(`/v1/posts/${sim.myPosts[0]}/like`, helper.apiKey)
        .send({})
        .expect(201);
    }

    // Wait for notifications
    await new Promise((r) => setTimeout(r, 300));

    const result = await sim.heartbeat();
    expect(result.homeStatus).toBe(200);
    expect(result.unreadNotifications).toBeGreaterThanOrEqual(1);
    expect(result.actions.some((a) => a.includes('notification'))).toBe(true);
  });

  it('Round 3: owner messages', async () => {
    // Owner sends a message
    await ownerPost('/v1/owner/messages', sim.creds.ownerToken)
      .send({ content: 'Please post about food today!' })
      .expect(201);

    const result = await sim.heartbeat();
    expect(result.homeStatus).toBe(200);
    expect(sim.memory.ownerGuidance).toContain('Please post about food today!');
    expect(result.actions.some((a) => a.includes('owner guidance'))).toBe(true);
  });

  it('Round 4: owner guidance persists', async () => {
    const result = await sim.heartbeat();
    expect(result.homeStatus).toBe(200);
    // Guidance from previous round should still be in memory
    expect(sim.memory.ownerGuidance).toContain('Please post about food today!');
  });

  it('Round 5: version check + memory limit', async () => {
    // Stuff memory to test limit enforcement
    for (let i = 0; i < 60; i++) {
      sim.memory.socialNotes.push(`padding note ${i}`);
    }
    const versionOk = await sim.checkSkillVersion();
    // skill.md may or may not exist in test env — either result is fine
    expect(typeof versionOk).toBe('boolean');

    const result = await sim.heartbeat();
    expect(result.homeStatus).toBe(200);

    // Memory should be trimmed to 50 lines
    const totalLines =
      sim.memory.ownerGuidance.length +
      sim.memory.recentActivity.length +
      sim.memory.socialNotes.length;
    expect(totalLines).toBeLessThanOrEqual(50);

    // Owner guidance should be preserved
    expect(sim.memory.ownerGuidance).toContain('Please post about food today!');
  });

  it('Deregister', async () => {
    await sim.deregister();
    expect(sim.stopped).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: 10-shrimp community (3 rounds)
// ---------------------------------------------------------------------------
describe('Scenario 2: 10-shrimp community', () => {
  const sims: AgentSimulator[] = [];

  beforeAll(async () => {
    windows.clear();
  });

  it('All boot', async () => {
    for (let i = 0; i < 10; i++) {
      windows.clear();
      const sim = new AgentSimulator(
        `社区虾${i}号`,
        `com${i}_${Date.now().toString(36).slice(-5)}`,
      );
      await sim.boot();
      sims.push(sim);

      // Age past throttle
      await prisma.agent.update({
        where: { id: sim.creds.id },
        data: { createdAt: new Date(Date.now() - 2 * 3600_000) },
      });
    }
    expect(sims.length).toBe(10);
    expect(sims.every((s) => s.creds.id)).toBe(true);
  });

  it('Round 1: everyone posts', async () => {
    for (const sim of sims) {
      const result = await sim.heartbeat();
      expect(result.homeStatus).toBe(200);
    }

    // All should have at least 1 post
    const totalPosts = sims.reduce((sum, s) => sum + s.myPosts.length, 0);
    expect(totalPosts).toBeGreaterThanOrEqual(10);
  });

  it('Round 2: interact with each other (likes + follows from feed)', async () => {
    for (const sim of sims) {
      const result = await sim.heartbeat();
      expect(result.homeStatus).toBe(200);
    }

    // Some agents should have liked or followed others
    const totalLikes = sims.reduce((sum, s) => sum + s.likedPosts.size, 0);
    const totalFollows = sims.reduce((sum, s) => sum + s.following.size, 0);
    expect(totalLikes + totalFollows).toBeGreaterThan(0);
  });

  it('Round 3: owner messages to 3 shrimps', async () => {
    windows.clear(); // Reset rate limits after heavy heartbeat rounds

    // Send owner messages to first 3 shrimps
    for (let i = 0; i < 3; i++) {
      await ownerPost('/v1/owner/messages', sims[i].creds.ownerToken)
        .send({ content: `Owner instruction for shrimp ${i}` })
        .expect(201);
    }

    // All heartbeat
    for (const sim of sims) {
      const result = await sim.heartbeat();
      expect(result.homeStatus).toBe(200);
    }

    // First 3 should have owner guidance
    for (let i = 0; i < 3; i++) {
      expect(sims[i].memory.ownerGuidance.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('Verify counts consistent', async () => {
    // Total posts across all agents
    const totalMyPosts = sims.reduce((sum, s) => sum + s.myPosts.length, 0);

    // Count posts in DB for these agents
    const agentIds = sims.map((s) => s.creds.id);
    const dbPostCount = await prisma.post.count({
      where: { agentId: { in: agentIds }, status: 'published' },
    });

    expect(dbPostCount).toBe(totalMyPosts);
  });

  afterAll(async () => {
    // Clean up: deregister all
    for (const sim of sims) {
      if (!sim.stopped) {
        await sim.deregister().catch(() => {});
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Error recovery (410 detection)
// ---------------------------------------------------------------------------
describe('Scenario 3: Error recovery — 410 detection', () => {
  let sim: AgentSimulator;

  beforeAll(async () => {
    windows.clear();
  });

  it('Agent heartbeating → owner deletes → next heartbeat detects 410 → stops', async () => {
    sim = new AgentSimulator('被删虾', `deleted_sim_${Date.now().toString(36)}`);
    await sim.boot();

    // Age past throttle
    await prisma.agent.update({
      where: { id: sim.creds.id },
      data: { createdAt: new Date(Date.now() - 2 * 3600_000) },
    });

    // Normal heartbeat
    const r1 = await sim.heartbeat();
    expect(r1.homeStatus).toBe(200);
    expect(sim.stopped).toBe(false);

    // Owner deletes agent
    await request
      .delete('/v1/agents/me')
      .set('Authorization', `Bearer ${sim.creds.ownerToken}`)
      .expect(200);

    // Next heartbeat detects 410
    const r2 = await sim.heartbeat();
    expect(r2.homeStatus).toBe(410);
    expect(r2.error).toBe(410);
    expect(sim.stopped).toBe(true);

    // Further heartbeats are no-ops
    const r3 = await sim.heartbeat();
    expect(r3.actions).toContain('skipped — agent stopped');
  });
});
