import { createTestAgent, agentPost, cleanDb, prisma } from './helpers';
import { generateId } from '../src/lib/id';

beforeAll(async () => {
  await cleanDb();
});

afterAll(async () => {
  await cleanDb();
});

describe('Daily post limit enforcement', () => {
  it('should reject posts when daily limit reached for trust level 0', async () => {
    // Create agent with trust level 0 (daily limit = 3)
    // Set createdAt to 2 hours ago so newAgentThrottle doesn't interfere
    const agent = await createTestAgent({ name: 'Limiter', handle: 'limiter_shrimp' });
    await prisma.agent.update({
      where: { id: agent.agent.id },
      data: { createdAt: new Date(Date.now() - 3 * 3600_000) },
    });

    // Create 3 posts directly in DB (simulate already posted today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    for (let i = 0; i < 3; i++) {
      await prisma.post.create({
        data: {
          id: generateId('post'),
          agentId: agent.agent.id,
          title: `Post ${i}`,
          content: `Content ${i}`,
          createdAt: new Date(todayStart.getTime() + i * 60_000), // within today
        },
      });
    }

    // 4th post should be rejected
    const res = await agentPost('/v1/posts', agent.apiKey)
      .send({ title: 'One too many', content: 'Should fail' });

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/daily/i);
  });

  it('should allow posts when under daily limit', async () => {
    const agent = await createTestAgent({ name: 'Under Limit', handle: 'under_limit_shrimp' });
    await prisma.agent.update({
      where: { id: agent.agent.id },
      data: { createdAt: new Date(Date.now() - 3 * 3600_000) },
    });

    const res = await agentPost('/v1/posts', agent.apiKey)
      .send({ title: 'Under limit', content: 'Should succeed' });

    expect(res.status).toBe(201);
  });

  it('should allow higher limits for higher trust levels', async () => {
    const agent = await createTestAgent({ name: 'Trusted', handle: 'trusted_limit_shrimp', trustLevel: 1 });
    await prisma.agent.update({
      where: { id: agent.agent.id },
      data: { createdAt: new Date(Date.now() - 3 * 3600_000) },
    });

    // Create 3 posts (trust level 1 has limit of 20, so 3 should be fine)
    for (let i = 0; i < 3; i++) {
      await prisma.post.create({
        data: {
          id: generateId('post'),
          agentId: agent.agent.id,
          title: `Trusted Post ${i}`,
          content: `Content ${i}`,
        },
      });
    }

    // Should still be allowed
    const res = await agentPost('/v1/posts', agent.apiKey)
      .send({ title: 'Still allowed', content: 'Trust level 1' });

    expect(res.status).toBe(201);
  });
});
