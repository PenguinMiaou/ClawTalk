import {
  request,
  prisma,
  createTestAgent,
  agentGet,
  agentPost,
  agentDel,
  cleanDb,
} from './helpers';

beforeAll(async () => {
  await cleanDb();
});

afterAll(async () => {
  await cleanDb();
});

describe('Circles CRUD', () => {
  let agent: Awaited<ReturnType<typeof createTestAgent>>;
  let trustedAgent: Awaited<ReturnType<typeof createTestAgent>>;

  beforeAll(async () => {
    agent = await createTestAgent({ name: 'Normal Shrimp', handle: 'normal_shrimp' });
    trustedAgent = await createTestAgent({ name: 'Trusted Shrimp', handle: 'trusted_shrimp', trustLevel: 2 });
  });

  describe('POST /v1/circles', () => {
    it('should reject agent with insufficient trust level', async () => {
      await agentPost('/v1/circles', agent.apiKey)
        .send({ name: '测试圈', description: '测试' })
        .expect(403);
    });

    it('should allow trusted agent to create circle', async () => {
      const res = await agentPost('/v1/circles', trustedAgent.apiKey)
        .send({ name: '数据圈', description: '数据相关话题', tags: ['data', '数据'], icon: '📊' })
        .expect(201);

      expect(res.body.id).toMatch(/^circle_/);
      expect(res.body.name).toBe('数据圈');
      expect(res.body.tags).toEqual(['data', '数据']);
    });

    it('should reject duplicate circle name', async () => {
      await agentPost('/v1/circles', trustedAgent.apiKey)
        .send({ name: '数据圈' })
        .expect(409);
    });
  });

  describe('GET /v1/circles', () => {
    it('should list circles', async () => {
      const res = await agentGet('/v1/circles', agent.apiKey).expect(200);
      expect(res.body.circles.length).toBeGreaterThanOrEqual(1);
      expect(res.body.circles[0]).toHaveProperty('name');
      expect(res.body.circles[0]).toHaveProperty('memberCount');
    });

    it('should search circles by name', async () => {
      const res = await agentGet('/v1/circles?q=数据', agent.apiKey).expect(200);
      expect(res.body.circles.length).toBe(1);
      expect(res.body.circles[0].name).toBe('数据圈');
    });
  });

  describe('GET /v1/circles/:id', () => {
    it('should return circle detail with topics and members', async () => {
      const circles = await prisma.circle.findMany();
      const circleId = circles[0].id;

      const res = await agentGet(`/v1/circles/${circleId}`, agent.apiKey).expect(200);
      expect(res.body.circle.name).toBe('数据圈');
      expect(res.body).toHaveProperty('topics');
      expect(res.body).toHaveProperty('members');
    });

    it('should return 404 for non-existent circle', async () => {
      await agentGet('/v1/circles/circle_nonexistent', agent.apiKey).expect(404);
    });
  });

  describe('POST /v1/circles/:id/join + DELETE /v1/circles/:id/leave', () => {
    let circleId: string;

    beforeAll(async () => {
      const circles = await prisma.circle.findMany();
      circleId = circles[0].id;
    });

    it('should allow agent to join circle', async () => {
      await agentPost(`/v1/circles/${circleId}/join`, agent.apiKey)
        .expect(201);

      const circle = await prisma.circle.findUnique({ where: { id: circleId } });
      expect(circle!.memberCount).toBe(1);
    });

    it('should reject duplicate join', async () => {
      await agentPost(`/v1/circles/${circleId}/join`, agent.apiKey)
        .expect(409);
    });

    it('should allow agent to leave circle', async () => {
      await agentDel(`/v1/circles/${circleId}/leave`, agent.apiKey)
        .expect(200);

      const circle = await prisma.circle.findUnique({ where: { id: circleId } });
      expect(circle!.memberCount).toBe(0);
    });

    it('should reject leave when not a member', async () => {
      await agentDel(`/v1/circles/${circleId}/leave`, agent.apiKey)
        .expect(404);
    });
  });

  describe('PATCH /v1/circles/:id (owner)', () => {
    it('should allow owner to update circle', async () => {
      const circles = await prisma.circle.findMany();
      const circleId = circles[0].id;

      const res = await request
        .patch(`/v1/circles/${circleId}`)
        .set('Authorization', `Bearer ${trustedAgent.ownerToken}`)
        .send({ description: 'Updated description', icon: '📈' })
        .expect(200);

      expect(res.body.description).toBe('Updated description');
      expect(res.body.icon).toBe('📈');
    });
  });

  describe('GET /v1/agents/:id/circles', () => {
    it('should return circles for an agent', async () => {
      const circles = await prisma.circle.findMany();
      const circleId = circles[0].id;

      // Join first
      await agentPost(`/v1/circles/${circleId}/join`, agent.apiKey).expect(201);

      const res = await agentGet(`/v1/agents/${agent.agent.id}/circles`, agent.apiKey).expect(200);
      expect(res.body.circles.length).toBe(1);
      expect(res.body.circles[0].name).toBe('数据圈');
    });
  });

  describe('Circle-Topic management (owner)', () => {
    let circleId: string;
    let topicId: string;

    beforeAll(async () => {
      const circles = await prisma.circle.findMany();
      circleId = circles[0].id;

      const topic = await prisma.topic.create({
        data: { id: 'topic_test1', name: 'SQL优化', description: 'SQL相关' },
      });
      topicId = topic.id;
    });

    it('should allow owner to add topic to circle', async () => {
      const res = await request
        .post(`/v1/circles/${circleId}/topics`)
        .set('Authorization', `Bearer ${trustedAgent.ownerToken}`)
        .send({ topicId })
        .expect(201);

      expect(res.body.message).toMatch(/linked/i);

      const circle = await prisma.circle.findUnique({ where: { id: circleId } });
      expect(circle!.topicCount).toBe(1);
    });

    it('should reject duplicate topic link', async () => {
      await request
        .post(`/v1/circles/${circleId}/topics`)
        .set('Authorization', `Bearer ${trustedAgent.ownerToken}`)
        .send({ topicId })
        .expect(409);
    });

    it('should allow owner to remove topic from circle', async () => {
      await request
        .delete(`/v1/circles/${circleId}/topics/${topicId}`)
        .set('Authorization', `Bearer ${trustedAgent.ownerToken}`)
        .expect(200);

      const circle = await prisma.circle.findUnique({ where: { id: circleId } });
      expect(circle!.topicCount).toBe(0);
    });
  });
});
