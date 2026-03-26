import { request, createTestAgent, cleanDb, prisma } from './helpers';

describe('GET /v1/owner/messages/listen', () => {
  let agent: any, apiKey: string, ownerToken: string;

  beforeEach(async () => {
    await cleanDb();
    ({ agent, apiKey, ownerToken } = await createTestAgent());
  });

  afterAll(async () => {
    await cleanDb();
  });

  it('returns 401 without auth', async () => {
    const res = await request.get('/v1/owner/messages/listen');
    expect(res.status).toBe(401);
  });

  it('returns existing unread messages immediately', async () => {
    await prisma.ownerMessage.create({
      data: {
        id: 'omsg_test1',
        agentId: agent.id,
        role: 'owner',
        content: 'hello shrimp',
        messageType: 'text',
      },
    });

    const res = await request
      .get('/v1/owner/messages/listen?timeout=1')
      .set('X-API-Key', apiKey);

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(1);
    expect(res.body.messages[0].content).toBe('hello shrimp');
  });

  it('updates lastListenAt to max createdAt of returned messages', async () => {
    const msg = await prisma.ownerMessage.create({
      data: {
        id: 'omsg_test2',
        agentId: agent.id,
        role: 'owner',
        content: 'test',
        messageType: 'text',
      },
    });

    await request
      .get('/v1/owner/messages/listen?timeout=1')
      .set('X-API-Key', apiKey);

    const updated = await prisma.agent.findUnique({ where: { id: agent.id } });
    expect(updated!.lastListenAt).toEqual(msg.createdAt);
  });

  it('returns empty array on timeout with no messages', async () => {
    const res = await request
      .get('/v1/owner/messages/listen?timeout=1')
      .set('X-API-Key', apiKey);

    expect(res.status).toBe(200);
    expect(res.body.messages).toEqual([]);
  });

  it('does not update lastListenAt on empty timeout', async () => {
    await request
      .get('/v1/owner/messages/listen?timeout=1')
      .set('X-API-Key', apiKey);

    const updated = await prisma.agent.findUnique({ where: { id: agent.id } });
    expect(updated!.lastListenAt).toBeNull();
  });

  it('respects since query parameter', async () => {
    const now = new Date();

    await prisma.ownerMessage.create({
      data: {
        id: 'omsg_old',
        agentId: agent.id,
        role: 'owner',
        content: 'old message',
        messageType: 'text',
        createdAt: new Date(now.getTime() - 60000),
      },
    });

    await prisma.ownerMessage.create({
      data: {
        id: 'omsg_new',
        agentId: agent.id,
        role: 'owner',
        content: 'new message',
        messageType: 'text',
        createdAt: new Date(now.getTime() + 1000),
      },
    });

    const res = await request
      .get(`/v1/owner/messages/listen?timeout=1&since=${now.toISOString()}`)
      .set('X-API-Key', apiKey);

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(1);
    expect(res.body.messages[0].content).toBe('new message');
  });
});
