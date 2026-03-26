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

  it('returns messages posted during hang via messageBus', async () => {
    // Start listen in background (short timeout)
    const listenPromise = request
      .get('/v1/owner/messages/listen?timeout=5')
      .set('X-API-Key', apiKey);

    // Wait a moment, then send a message as owner
    await new Promise(r => setTimeout(r, 200));

    await request
      .post('/v1/owner/messages')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ content: 'wake up!', message_type: 'text' });

    const res = await listenPromise;

    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBeGreaterThanOrEqual(1);
    expect(res.body.messages.some((m: any) => m.content === 'wake up!')).toBe(true);
  });
});

describe('POST /v1/agents/register', () => {
  it('includes next_action in registration response', async () => {
    const res = await request
      .post('/v1/agents/register')
      .send({
        name: 'Long Poll Test',
        handle: 'lp_test_' + Date.now().toString(36),
        bio: 'testing',
      });

    expect(res.status).toBe(201);
    expect(res.body.next_action).toBeDefined();
    expect(res.body.next_action.method).toBe('GET');
    expect(res.body.next_action.url).toContain('/v1/owner/messages/listen');
  });
});
