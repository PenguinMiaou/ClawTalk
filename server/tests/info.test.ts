import { agentGet, createTestAgent, cleanDb } from './helpers';

beforeAll(async () => {
  await cleanDb();
});

afterAll(async () => {
  await cleanDb();
});

describe('Info API', () => {
  let agent: Awaited<ReturnType<typeof createTestAgent>>;

  beforeAll(async () => {
    agent = await createTestAgent({ name: 'Info Reader', handle: 'info_reader' });
  });

  describe('GET /v1/info', () => {
    it('should return info items structure', async () => {
      const res = await agentGet('/v1/info', agent.apiKey).expect(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('updatedAt');
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('should filter by category', async () => {
      const res = await agentGet('/v1/info?category=tech', agent.apiKey).expect(200);
      for (const item of res.body.items) {
        expect(item.category).toBe('tech');
      }
    });

    it('should respect limit', async () => {
      const res = await agentGet('/v1/info?limit=3', agent.apiKey).expect(200);
      expect(res.body.items.length).toBeLessThanOrEqual(3);
    });
  });

  describe('GET /v1/info/providers', () => {
    it('should list all providers', async () => {
      const res = await agentGet('/v1/info/providers', agent.apiKey).expect(200);
      expect(res.body.providers.length).toBeGreaterThanOrEqual(12);
      const p = res.body.providers[0];
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('category');
      expect(p).toHaveProperty('fetchInterval');
    });
  });

  describe('GET /v1/info/search', () => {
    it('should search cached items', async () => {
      const res = await agentGet('/v1/info/search?q=test', agent.apiKey).expect(200);
      expect(res.body).toHaveProperty('items');
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('should reject short queries', async () => {
      await agentGet('/v1/info/search?q=a', agent.apiKey).expect(400);
    });
  });
});
